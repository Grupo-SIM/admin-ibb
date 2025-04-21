"use client"
import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Calendar,
  Lock,
  User,
  CreditCard as CardIcon,
} from "lucide-react";
import Script from "next/script";

const CreditCardForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    document: "",
    number: "",
    cvv: "",
    month: "",
    year: "",
    installments: 1,
  });

  const [paymentData, setPaymentData] = useState({
    token: "",
    brand: "",
    bin: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const public_key = "pk_4ce776b5-0d68-4fbe-b1eb-be10c94ca4e6";

      const data_card = {
        name: formData.name,
        document: formData.document.replace(/\D/g, ""),
        number: formData.number.replace(/\s/g, ""),
        cvv: formData.cvv,
        month: formData.month,
        year: formData.year,
      };

      // @ts-ignore - A função getTokenCard é injetada pelo SDK
      window.getTokenCard(
        public_key,
        data_card,
        formData.installments,
        (response: any) => {
          if (response.token) {
            setPaymentData({
              token: response.token,
              brand: response.brand,
              bin: response.bin,
            });
            // Aqui você pode enviar os dados para seu backend
            console.log("Dados do pagamento:", response);
          } else {
            setError(response.msgError || "Erro ao processar pagamento");
          }
          setLoading(false);
        }
      );
    } catch (err) {
      setError("Erro ao processar pagamento. Tente novamente.");
      setLoading(false);
    }
  };

  const handleChange = (e: any) => {
    const { name, value } = e.target;

    let formattedValue = value;

    // Formatação do número do cartão
    if (name === "number") {
      formattedValue = value
        .replace(/\D/g, "")
        .replace(/(\d{4})/g, "$1 ")
        .trim();
    }

    // Formatação do CPF/CNPJ
    if (name === "document") {
      if (value.length <= 14) {
        // CPF
        formattedValue = value
          .replace(/\D/g, "")
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d)/, "$1.$2")
          .replace(/(\d{3})(\d{1,2})/, "$1-$2")
          .replace(/(-\d{2})\d+?$/, "$1");
      } else {
        // CNPJ
        formattedValue = value
          .replace(/\D/g, "")
          .replace(/^(\d{2})(\d)/, "$1.$2")
          .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
          .replace(/\.(\d{3})(\d)/, ".$1/$2")
          .replace(/(\d{4})(\d)/, "$1-$2")
          .replace(/(-\d{2})\d+?$/, "$1");
      }
    }

    setFormData((prev) => ({ ...prev, [name]: formattedValue }));
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Script
        src="https://apiv3.dompagamentos.com.br/js/sdk-dompagamentos.min.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("SDK DOM Pagamentos carregado");
        }}
      />
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <CardIcon className="w-6 h-6" />
          Pagamento com Cartão de Crédito
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome no Cartão
                </div>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="NOME COMO ESTÁ NO CARTÃO"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  CPF/CNPJ
                </div>
              </label>
              <input
                type="text"
                name="document"
                value={formData.document}
                onChange={handleChange}
                placeholder="000.000.000-00"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Número do Cartão
                </div>
              </label>
              <input
                type="text"
                name="number"
                value={formData.number}
                onChange={handleChange}
                placeholder="1234 5678 9012 3456"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Mês
                  </div>
                </label>
                <select
                  name="month"
                  value={formData.month}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                >
                  <option value="">MM</option>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = (i + 1).toString().padStart(2, "0");
                    return (
                      <option key={month} value={month}>
                        {month}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Ano
                  </div>
                </label>
                <select
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                >
                  <option value="">AA</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = (new Date().getFullYear() + i)
                      .toString()
                      .slice(-2);
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    CVV
                  </div>
                </label>
                <input
                  type="text"
                  name="cvv"
                  value={formData.cvv}
                  onChange={handleChange}
                  placeholder="123"
                  maxLength={4}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Parcelas
              </label>
              <select
                name="installments"
                value={formData.installments}
                onChange={handleChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}x {i === 0 ? "à vista" : "sem juros"}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition duration-200 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Processando..." : "Realizar Pagamento"}
          </button>

          {/* Campos ocultos para o token */}
          <input type="hidden" name="token" value={paymentData.token} />
          <input type="hidden" name="brand" value={paymentData.brand} />
          <input type="hidden" name="bin" value={paymentData.bin} />
        </form>
      </div>
    </div>
  );
};

export default CreditCardForm;
