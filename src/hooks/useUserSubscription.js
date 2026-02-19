import { useState, useEffect, useCallback } from 'react'
import { db } from '../firebase'
import { collection, onSnapshot } from 'firebase/firestore'

/** Stripe Price IDs → Plan mapping */
export const PLAN_PRICES = {
  PRO: 'price_1T2HFN1pBe1FB1ICkWaITkCD',
  UNLIMITED: 'price_1T2ao81pBe1FB1ICFjI0SVUb'
}

/** Plan → storage limit (GB) */
export const STORAGE_LIMITS = {
  Free: 15,
  Pro: 500,
  Unlimited: 1000
}

const VALID_STATUSES = ['active', 'trialing']

/**
 * Derives userPlan from a Stripe price ID
 */
function priceIdToPlan(priceId) {
  if (!priceId) return 'Free'
  if (priceId === PLAN_PRICES.UNLIMITED) return 'Unlimited'
  if (priceId === PLAN_PRICES.PRO) return 'Pro'
  return 'Free'
}

/**
 * Extracts the first relevant price ID from a subscription document
 * Supports common Stripe Extension structures: items[].price.id or price.id
 */
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

/**
 * Real-time subscription hook. Listens to customers/{uid}/subscriptions
 * and derives userPlan + storageLimit.
 *
 * @param {string} uid - Firebase Auth UID
 * @returns {{ userPlan: 'Free'|'Pro'|'Unlimited', storageLimit: number, loading: boolean }}
 */
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

    const subsRef = collection(db, 'customers', uid, 'subscriptions')
    const unsubscribe = onSnapshot(subsRef, (snapshot) => {
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
    }, (err) => {
      console.error('useUserSubscription error:', err)
      setUserPlan('Free')
      setStorageLimit(STORAGE_LIMITS.Free)
      setLoading(false)
    })

    return () => unsubscribe()
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
