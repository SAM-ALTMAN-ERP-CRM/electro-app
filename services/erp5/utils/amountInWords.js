/**
 * Helper to convert numerical amounts into words using the Indian numbering system.
 * (Crores, Lakhs, Thousands, Hundreds, Units, and Paise).
 *
 * Example:
 *   amountInWords(12500) -> "Rupees Twelve Thousand Five Hundred Only"
 *   amountInWords(22411.74) -> "Rupees Twenty-Two Thousand Four Hundred Eleven and Seventy-Four Paise Only"
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertBelowThousand(n) {
  let str = '';
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + ' Hundred ';
    n %= 100;
  }
  if (n >= 20) {
    const tensPart = TENS[Math.floor(n / 10)];
    const onesPart = ONES[n % 10];
    str += (onesPart ? `${tensPart}-${onesPart} ` : `${tensPart} `);
  } else if (n > 0) {
    str += ONES[n] + ' ';
  }
  return str.trim();
}

function amountInWords(num) {
  const parsed = parseFloat(num);
  if (isNaN(parsed) || parsed < 0) return 'Invalid Amount';
  if (parsed === 0) return 'Rupees Zero Only';

  const rupees = Math.floor(parsed);
  const paise = Math.round((parsed - rupees) * 100);

  let remaining = rupees;
  const parts = [];

  // Crores (10,000,000)
  if (remaining >= 10000000) {
    const crore = Math.floor(remaining / 10000000);
    parts.push(convertBelowThousand(crore) + ' Crore');
    remaining %= 10000000;
  }

  // Lakhs (100,000)
  if (remaining >= 100000) {
    const lakh = Math.floor(remaining / 100000);
    parts.push(convertBelowThousand(lakh) + ' Lakh');
    remaining %= 100000;
  }

  // Thousands (1,000)
  if (remaining >= 1000) {
    const thousand = Math.floor(remaining / 1000);
    parts.push(convertBelowThousand(thousand) + ' Thousand');
    remaining %= 1000;
  }

  // Hundreds & Remaining below 1000
  if (remaining > 0) {
    parts.push(convertBelowThousand(remaining));
  }

  let result = 'Rupees ' + parts.join(' ').trim();

  if (paise > 0) {
    result += ' and ' + convertBelowThousand(paise) + ' Paise';
  }

  return result + ' Only';
}

module.exports = {
  amountInWords
};
