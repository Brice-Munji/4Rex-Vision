"use client";

import { useEffect } from "react";
import { MotionGlobalConfig } from "framer-motion";

/**
 * Turns OFF all animations across the authenticated app (dashboard) the moment
 * the app shell mounts — i.e. right after login / sign-up.
 *
 * Two mechanisms, because the app animates in two ways:
 *  - framer-motion (JS-driven transforms/opacity) → MotionGlobalConfig.skipAnimations
 *  - CSS transitions/animations (hover, pulse, ping, spin, skeletons, tailwindcss-animate)
 *    → a `data-noanim` flag on <html> that a global stylesheet keys off of.
 *
 * The flag lives on <html> so it also covers modals/toasts that portal to <body>.
 * Analytics/graphs can opt back in with the `allow-anim` class (see globals.css).
 */
export function DisableAnimations() {
  useEffect(() => {
    const prevSkip = MotionGlobalConfig.skipAnimations;
    MotionGlobalConfig.skipAnimations = true;
    document.documentElement.setAttribute("data-noanim", "");
    return () => {
      MotionGlobalConfig.skipAnimations = prevSkip;
      document.documentElement.removeAttribute("data-noanim");
    };
  }, []);

  return null;
}
