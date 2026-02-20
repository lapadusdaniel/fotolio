import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot, doc } from 'firebase/firestore' // Am adăugat doc

export const PLAN_PRICES = {
  PRO: 'price_1T2HFN1pBe1FB1ICkWaITkCD',
  UNLIMITED: 'price_1T2ao81pBe1FB1ICFjI0SVUb'
}

export const STORAGE_LIMITS = {
  Free: 15,
  Pro: 500,
  Unlimited: 1000
}

const VALID_STATUSES = ['active', 'trialing']

function priceIdToPlan(priceId) {
  if (!priceId) return 'Free'
  if (priceId === PLAN_PRICES.UNLIMITED) return 'Unlimited'
  if (priceId === PLAN_PRICES.PRO) return 'Pro'
  return 'Free'
}

function getPriceIdFromSubscription(docData) {
  if (!docData) return null
  const items = docData.items?.data ?? docData.items
  if (items && Array.isArray(items)) {
    const item = items.find((i) => i?.price?.id)
    return item?.price?.id ?? null
  }
  if (docData.price?.id) return docData.price.id
  return null
}

export function useUserSubscription(uid) {
  const [userPlan, setUserPlan] = useState('Free')
  const [storageLimit, setStorageLimit] = useState(STORAGE_LIMITS.Free)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) {
      setUserPlan('Free')
      setStorageLimit(STORAGE_LIMITS.Free)
      setLoading(false)
      return
    }

    let unsubStripe = null;

    // 1. Ascultăm în timp real după OVERRIDE (Setat din Admin Panel)
    const unsubOverride = onSnapshot(doc(db, 'adminOverrides', uid), (overrideSnap) => {
      if (overrideSnap.exists() && overrideSnap.data().plan) {
        // Dacă există un plan setat manual de tine, îl folosim direct
        const overridePlan = overrideSnap.data().plan
        setUserPlan(overridePlan)
        setStorageLimit(STORAGE_LIMITS[overridePlan] || STORAGE_LIMITS.Free)
        setLoading(false)

        // Dacă avem override, oprim ascultarea Stripe (pentru a economisi resurse)
        if (unsubStripe) {
          unsubStripe()
          unsubStripe = null
        }
      } else {
        // 2. Dacă NU există override, ascultăm subscripțiile din Stripe
        if (!unsubStripe) {
          const subsRef = collection(db, 'customers', uid, 'subscriptions')
          unsubStripe = onSnapshot(subsRef, (snapshot) => {
            let plan = 'Free'
            snapshot.docs.forEach((docSnap) => {
              const data = docSnap.data()
              const status = (data?.status || '').toLowerCase()
              if (!VALID_STATUSES.includes(status)) return

              const priceId = getPriceIdFromSubscription(data)
              const derived = priceIdToPlan(priceId)
              if (derived === 'Unlimited') plan = 'Unlimited'
              else if (derived === 'Pro' && plan !== 'Unlimited') plan = 'Pro'
            })

            setUserPlan(plan)
            setStorageLimit(STORAGE_LIMITS[plan] ?? STORAGE_LIMITS.Free)
            setLoading(false)
          })
        }
      }
    })

    // Curățăm ambele ascultări când componenta se închide
    return () => {
      if (unsubOverride) unsubOverride()
      if (unsubStripe) unsubStripe()
    }
  }, [uid])

  const checkAccess = useCallback((feature) => {
    switch (feature) {
      case 'pro':
      case 'site':
      case 'customSlug':
        return userPlan === 'Pro' || userPlan === 'Unlimited'
      case 'unlimited':
      case 'customDomain':
        return userPlan === 'Unlimited'
      default:
        return false
    }
  }, [userPlan])

  return { userPlan, storageLimit, loading, checkAccess }
}