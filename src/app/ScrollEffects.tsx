"use client";

import { useEffect } from "react";

export default function ScrollEffects() {
  useEffect(() => {
    /* ---- Header shadow on scroll ---- */
    const header = document.querySelector("header");
    function handleScroll() {
      if (header) {
        header.classList.toggle("scrolled", window.scrollY > 10);
      }
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    /* ---- Scroll reveal ---- */
    const reveals = document.querySelectorAll(".reveal");
    if (!reveals.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    reveals.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  return null;
}

