"use client";

import { performLogout } from "@/lib/actions/auth.actions";
import { useEffect } from "react";

/**
 * Logout page - serves as the logout endpoint
 * This page immediately calls the logout action when accessed via the navbar link
 *
 * Client Component because Server Actions must be called from form submissions
 * or event handlers, not directly from Server Component bodies
 */
export default function LogoutPage() {
  useEffect(() => {
    performLogout();
  }, []);

  // Show nothing while redirect happens
  return null;
}
