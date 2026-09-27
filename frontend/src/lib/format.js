// Indian rupee formatting (lakh/crore grouping)
export const inr = (n, decimals = false) => {
  const num = Number(n || 0);
  const opts = decimals
    ? { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    : { maximumFractionDigits: 0 };
  return '₹' + num.toLocaleString('en-IN', opts);
};

export const inrPlain = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export const today = () => new Date().toISOString().slice(0, 10);
