# Compliance Boundary

## Overview
UntoldMoney is an analytics and decision-support platform. This document defines the compliance boundaries that must be respected across all features, AI/ML outputs, and user communications.

## What We ARE
- A data analytics platform
- A portfolio tracking tool
- A trade journaling system
- An educational insights provider
- A risk visualization tool

## What We Are NOT
- A financial advisor (SEBI RIA/RA registration not held)
- A broker or order execution platform
- A tip provider or recommendation service
- A guaranteed prediction system

## Compliance Rules

### 1. No Financial Advice
- Never present computed data as financial advice
- Always include appropriate disclaimers
- AI explanations must explain data, not recommend actions
- Use language like "data suggests" not "you should buy"

### 2. AI/ML Output Boundaries
- ML predictions are experimental and clearly labeled
- Confidence intervals must be displayed with predictions
- No guarantee language in any AI output
- All AI outputs include "This is not financial advice" disclaimer

### 3. User Consent
- Explicit consent for terms of service at registration
- Explicit consent for privacy policy at registration
- Consent version tracking for audit
- IP address and user agent logged with consent

### 4. Data Handling
- User data encrypted at rest (future)
- JWT tokens with short expiry
- Refresh tokens securely hashed before storage
- Audit logs for all authentication events
- User data export capability (GDPR Article 20)
- Account deletion capability (GDPR Article 17)

### 5. Disclaimers (Required on)
- Landing page
- Dashboard
- Stock detail pages
- Any AI/ML generated content
- Trade analytics pages

### Standard Disclaimer Text
> "UntoldMoney is an analytics platform for educational and informational purposes only. It does not constitute financial advice. Past performance is not indicative of future results. Always consult a qualified financial advisor before making investment decisions."

## Regulatory Awareness
- SEBI regulations for Indian market data usage
- Data provider licensing requirements
- Market data redistribution policies
- Future: SEBI RIA registration if advisory features are added
