"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  Check,
  Compass,
  Diamond,
  Lightning,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { PLANS, type Plan } from "../content";
import shared from "../landing.module.css";
import { SPRING } from "../motion";
import styles from "./pricing.module.css";
import { Magnetic } from "./Magnetic";

type Billing = "monthly" | "yearly";

const inr = new Intl.NumberFormat("en-IN");

const PLAN_ICONS: Record<string, Icon> = { starter: Compass, pro: Lightning, elite: Diamond };

export function Pricing() {
  const [billing, setBilling] = useState<Billing>("monthly");

  return (
    <section id="pricing" className={shared.darkSection} aria-labelledby="pricing-title">
      <div className={shared.darkPanel}>
        <div className={shared.container}>
          <div className={cn(shared.sectionHead, shared.sectionHeadCenter)} data-reveal>
            <span className={shared.eyebrow}>Pricing</span>
            <h2 id="pricing-title" className={shared.h2}>
              Start free. Upgrade when it earns its place.
            </h2>
            <p className={shared.lede}>
              Every plan includes the full method and every explanation.
            </p>
          </div>

          <div className={styles.toggleRow} data-reveal>
            <div className={styles.toggle} role="group" aria-label="Billing period">
              {(["monthly", "yearly"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={billing === option}
                  onClick={() => setBilling(option)}
                >
                  {billing === option && (
                    <motion.span
                      layoutId="billing-pill"
                      className={styles.pill}
                      transition={{ type: "spring", ...SPRING }}
                    />
                  )}
                  <span className={styles.toggleLabel}>
                    {option === "monthly" ? "Monthly" : "Yearly"}
                    {option === "yearly" && <span className={styles.save}>Save 20%</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.plans}>
            {PLANS.map((plan) => (
              <PlanCard key={plan.id} plan={plan} billing={billing} />
            ))}
          </div>

          <div
            className={cn(shared.sectionHead, shared.sectionHeadCenter, styles.closing)}
            data-reveal
          >
            <span className={styles.closingIcon}>
              <UsersThree size={18} weight="fill" />
            </span>
            <h2 className={shared.h2}>Built for investors who want the reasoning</h2>
            <p className={shared.lede}>
              Whether you hold for years or trade for days, UntoldMoney shows the numbers behind
              every call, so the decision stays yours.
            </p>
            <Link className={cn(shared.btn, styles.white)} href="/register">
              Get started free
              <ArrowUpRight size={16} weight="bold" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function PlanCard({ plan, billing }: { plan: Plan; billing: Billing }) {
  const price = billing === "monthly" ? plan.monthly : plan.yearly;
  const note =
    plan.monthly === 0
      ? "Free for as long as you like"
      : billing === "yearly"
        ? `Billed ₹${inr.format(plan.yearly * 12)} a year`
        : "Billed monthly, cancel anytime";

  const PlanIcon = PLAN_ICONS[plan.id] ?? Compass;

  return (
    <article className={cn(styles.plan, plan.featured && styles.featured)} data-reveal>
      {plan.featured && <span className={styles.ribbon}>Most popular</span>}
      <div className={styles.planTop}>
        <span className={styles.icon}>
          <PlanIcon size={20} weight="fill" />
        </span>
        <div className={styles.price}>
          <span className={styles.currency}>₹</span>
          <span className={styles.amountWrap}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={price}
                className={cn(styles.amount, shared.num)}
                initial={{ y: "60%", opacity: 0 }}
                animate={{ y: "0%", opacity: 1 }}
                exit={{ y: "-60%", opacity: 0 }}
                transition={{ type: "spring", ...SPRING }}
              >
                {inr.format(price)}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className={styles.per}>/ month</span>
        </div>
      </div>
      <h3 className={styles.name}>{plan.name}</h3>
      <p className={styles.blurb}>{plan.blurb}</p>
      <p className={styles.note}>{note}</p>

      <div className={styles.inset}>
        <ul className={styles.features}>
          {plan.features.map((feature) => (
            <li key={feature}>
              <span className={styles.check}>
                <Check size={11} weight="bold" aria-hidden="true" />
              </span>
              {feature}
            </li>
          ))}
        </ul>
        <Magnetic strength={0.12} className={styles.ctaWrap} block>
          <Link
            className={cn(shared.btn, styles.cta, plan.featured && styles.white)}
            href="/register"
          >
            {plan.cta}
            <ArrowUpRight size={15} weight="bold" aria-hidden="true" />
          </Link>
        </Magnetic>
      </div>
    </article>
  );
}
