import React from 'react';
import './SubscriptionSection.css';

const SubscriptionSection = ({ user }) => {
  const userPlan = user?.plan || 'Free';

  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: '0 lei',
      features: ['15 GB Stocare Cloud', 'Galerii nelimitate', 'Branding de bază'],
      isCurrent: userPlan === 'Free',
      cta: 'Plan Actual',
      disabled: true
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

  const handleStripeCheckout = (planId) => {
    if (planId === 'free') return;
    alert(`Inițiem plata pentru planul ${planId.toUpperCase()}. Redirecționare către Stripe...`);
  };

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
              onClick={() => handleStripeCheckout(plan.id)}
              disabled={plan.isCurrent}
            >
              {plan.isCurrent ? 'Planul tău' : plan.cta}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionSection;