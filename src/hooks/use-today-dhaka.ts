"use client";

import { startTransition, useEffect, useState } from "react";

import { todayDhaka } from "@/lib/time";

export function useTodayDhaka() {
  const [today, setToday] = useState("");
  useEffect(() => {
    startTransition(() => {
      setToday(todayDhaka());
    });
  }, []);
  return today;
}
