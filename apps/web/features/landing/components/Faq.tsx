"use client";

import { useId, useState } from "react";
import { Plus } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { FAQS } from "../content";
import shared from "../landing.module.css";
import styles from "./faq.module.css";

export function Faq() {
  const [open, setOpen] = useState(0);
  const baseId = useId();

  return (
    <section id="faq" className={shared.section}>
      <div className={cn(shared.container, styles.grid)}>
        <div className={shared.sectionHead} data-reveal>
          <span className={shared.eyebrow}>FAQ</span>
          <h2 className={shared.h2}>Questions, answered plainly</h2>
          <p className={shared.lede}>
            The short version: UntoldMoney explains the numbers. Decisions and trades stay with you.
          </p>
        </div>

        <ul className={styles.list}>
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            const panelId = `${baseId}-panel-${i}`;
            const buttonId = `${baseId}-button-${i}`;
            return (
              <li key={item.q} className={styles.item} data-open={isOpen} data-reveal>
                <h3 className={styles.question}>
                  <button
                    id={buttonId}
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                  >
                    {item.q}
                    <span className={styles.icon} aria-hidden="true">
                      <Plus size={16} weight="bold" />
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={styles.panel}
                  inert={!isOpen}
                >
                  <div>
                    <p>{item.a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
