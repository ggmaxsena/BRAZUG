"use strict";

/**
 * Formata data para padrão brasileiro
 */
function formatDate(date) {
  return new Date(date).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Formata número com separador de milhares
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formata preço em gold
 */
function formatGold(price) {
  return `${formatNumber(price)} gold`;
}

/**
 * Truncate texto se muito longo
 */
function truncate(text, maxLength = 100) {
  if (!text) return "";
  return text.length > maxLength ? text.slice(0, maxLength - 3) + "..." : text;
}

module.exports = { formatDate, formatNumber, formatGold, truncate };
