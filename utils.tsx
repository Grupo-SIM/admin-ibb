import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Função utilitária para mesclar classes CSS de forma inteligente
 * Combina clsx para condicionais e twMerge para resolver conflitos do Tailwind
 * 
 * @param inputs - Classes CSS, objetos ou arrays de classes
 * @returns String de classes CSS mesclada e otimizada
 * 
 * @example
 * // Classes simples
 * cn('px-2 py-1', 'btn-red') // => 'px-2 py-1 btn-red'
 * 
 * // Com condicionais
 * cn('btn', {
 *   'btn-active': isActive,
 *   'btn-disabled': isDisabled
 * }) // => 'btn btn-active' (se isActive for true)
 * 
 * // Resolvendo conflitos do Tailwind
 * cn('px-2 py-1', 'p-4') // => 'p-4' (p-4 sobrescreve px-2 py-1)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Função de formatação de data para o formato brasileiro
 * @param date - Data a ser formatada
 * @returns Data formatada no padrão dd/mm/yyyy
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

/**
 * Função para formatar números como moeda brasileira
 * @param value - Valor a ser formatado
 * @returns Valor formatado como moeda (R$)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Função para formatar um número de telefone brasileiro
 * @param phone - Número de telefone (apenas números)
 * @returns Telefone formatado
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
}

/**
 * Função debounce para limitar a frequência de execução de uma função
 * @param func - Função a ser executada
 * @param wait - Tempo de espera em millisegundos
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Função para gerar um slug a partir de uma string
 * @param str - String para gerar o slug
 * @returns Slug gerado
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Função para truncar um texto
 * @param str - String para truncar
 * @param length - Tamanho máximo
 * @returns Texto truncado
 */
export function truncateText(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}

/**
 * Função para extrair o ID de um vídeo do YouTube de uma URL
 * @param url - URL do YouTube
 * @returns ID do vídeo
 */
export function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}