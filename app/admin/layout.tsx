"use client";
import { Layout } from "@/components/layout/layout";
import { useToast } from "@/hooks/use-toast";
import React from "react";

const AdminDashboard = ({ children }: any) => {
  const { Toasts } = useToast();
  return (
    <Layout>
     {children}
     <Toasts />
    </Layout>
  );
};

export default AdminDashboard;
