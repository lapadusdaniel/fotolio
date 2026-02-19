import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, onSnapshot } from 'firebase/firestore';
import './SubscriptionSection.css';

const SubscriptionSection = ({ user, userPlan: userPlanProp, storageLimit, checkAccess }) => {
  const [loadingPlan, setLoadingPlan] = useState(null);
  const userPlan = userPlanProp ?? user?.plan ?? 'Free';

  // ID-urile tale de preț din Stripe
  const STRIPE_PRICES = {
    pro: 'price_1T2HFN1pBe1FB1ICkWaITkCD', 
    unlimited: 'price_1T2ao81pBe1FB1ICFjI0SVUb'
  };

  const handleCheckout = async (planId) => {
    if (planId === 'free') return;
    setLoadingPlan(planId);

    try {
      // 1. Pregătim datele de facturare (momentan hardcoded, le vom lua dintr-un modal ulterior)
      const billingMetadata = {
        firebaseUID: user.uid,
        tip_client: 'pj', // pf = persoana fizica, pj = firma
        nume_firma: 'Client Test SRL',
        cui: 'RO12345678',
        adresa: 'Str. Exemplu, Nr. 1, Bucuresti'
      };

      // 2. Creăm sesiunea de checkout în colecția pe care extensia Invertase o ascultă
      // NOTĂ: Dacă în configurarea extensiei ai lăsat 'customers', folosim calea de mai jos:
      const docRef = await addDoc(collection(db, 'customers', user.uid, 'checkout_sessions'), {
        price: STRIPE_PRICES[planId],
        success_url: window.location.origin + '/dashboard?payment=success',
        cancel_url: window.location.origin + '/dashboard?payment=cancel',
        allow_promotion_codes: true, // Util pentru campanii de marketing viitoare
        metadata: billingMetadata // Datele vitale pentru e-Factura / SmartBill
      });

      // 3. Ascultăm după URL-ul de redirecționare generat de Stripe
      onSnapshot(docRef, (snap) => {
        const { error, url } = snap.data();
        if (error) {
          alert(`Eroare Stripe: ${error.message}`);
          setLoadingPlan(null);
        }
        if (url) {
          // 4. Redirecționare către pagina de plată securizată
          window.location.assign(url);
        }
      });
    } catch (err) {
      console.error("Eroare checkout:", err);
      setLoadingPlan(null);
      alert("Nu s-a putut iniția sesiunea de plată.");
    }
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '0 lei',
      features: ['15 GB Stocare Cloud', 'Galerii nelimitate', 'Branding de bază'],
      isCurrent: userPlan === 'Free',
      cta: 'Plan Actual'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: '100 lei',
      period: '/lună',
      features: ['500 GB Stocare Cloud', 'Branding Personalizat', 'URL-uri Custom (slugs)', 'Suport Prioritar'],
      isCurrent: userPlan === 'Pro',
      cta: 'Treci la Pro',
      highlight: true
    },
    {
      id: 'unlimited',
      name: 'Unlimited',
      price: '150 lei',
      period: '/lună',
      features: ['1 TB Stocare Cloud', 'Tot ce include Pro', 'Domeniu Personalizat', 'Suport WhatsApp'],
      isCurrent: userPlan === 'Unlimited',
      cta: 'Alege Unlimited',
      highlight: false
    }
  ];

  return (
    <div className="sub-wrapper">
      <div className="sub-header">
        <h2 className="sub-display-title">Alege planul potrivit <em>viziunii tale.</em></h2>
        <p className="sub-display-sub">Scalabilitate maximă pentru portofoliul tău profesional.</p>
      </div>

      <div className="sub-pricing-grid">
        {plans.map((plan) => (
          <div key={plan.id} className={`sub-plan-card ${plan.highlight ? 'pro-featured' : ''}`}>
            {plan.highlight && <div className="sub-plan-badge">Cel mai ales</div>}
            <h3 className="sub-plan-name">{plan.name}</h3>
            <div className="sub-plan-price">
              {plan.price}
              {plan.period && <span className="sub-period">{plan.period}</span>}
            </div>
            <ul className="sub-plan-features">
              {plan.features.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
            <button 
              className={`sub-plan-btn ${plan.highlight ? 'btn-gold-filled' : 'btn-outline'}`}
              onClick={() => handleCheckout(plan.id)}
              disabled={plan.isCurrent || (loadingPlan && loadingPlan !== plan.id)}
            >
              {loadingPlan === plan.id ? 'Se încarcă...' : plan.isCurrent ? 'Planul tău' : plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionSection;