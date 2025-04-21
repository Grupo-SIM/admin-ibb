"use client";

import DashboardTiles from "@/components/dash";
import { useToast } from "@/hooks/use-toast";
import React from "react";

const AdminPrayer = () => {
  const { Toasts } = useToast();
  return (
    <>
      <DashboardTiles />
      <Toasts />
    </>
  );
};

export default AdminPrayer;
