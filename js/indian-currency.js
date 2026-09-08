/**
 * Indian Currency to Words Converter
 * Handles Indian Numbering System: Crores, Lakhs, Thousands, Hundreds, Units, Paise
 */

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertTwoDigits(n) {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return TENS[ten] + (one ? ' ' + ONES[one] : '');
}

function convertThreeDigits(n) {
  let str = '';
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;

  if (hundreds > 0) {
    str += ONES[hundreds] + ' Hundred';
    if (remainder > 0) str += ' ';
  }

  if (remainder > 0) {
    str += convertTwoDigits(remainder);
  }

  return str;
}

/**
 * Converts a number to Indian Currency Words
 * Example: 1245600.50 -> "Rupees Twelve Lakh Forty-Five Thousand Six Hundred and Fifty Paise Only"
 * @param {number|string} amount 
 * @returns {string}
 */
export function amountToIndianWords(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) {
    return 'Zero Rupees Only';
  }

  let num = Number(amount);
  if (num === 0) return 'Zero Rupees Only';
  if (num < 0) return 'Negative ' + amountToIndianWords(Math.abs(num));

  // Split into whole and decimal parts
  const parts = num.toFixed(2).split('.');
  let integerPart = parseInt(parts[0], 10);
  const paise = parseInt(parts[1], 10);

  if (integerPart === 0 && paise === 0) return 'Zero Rupees Only';

  let words = '';

  // Crores (>= 1,00,00,000)
  if (integerPart >= 10000000) {
    const crores = Math.floor(integerPart / 10000000);
    const croreWords = amountToIndianWords(crores).replace('Rupees ', '').replace(' Only', '');
    words += croreWords + ' Crore ';
    integerPart %= 10000000;
  }

  // Lakhs (>= 1,00,000)
  if (integerPart >= 100000) {
    const lakhs = Math.floor(integerPart / 100000);
    words += convertTwoDigits(lakhs) + ' Lakh ';
    integerPart %= 100000;
  }

  // Thousands (>= 1,000)
  if (integerPart >= 1000) {
    const thousands = Math.floor(integerPart / 1000);
    words += convertTwoDigits(thousands) + ' Thousand ';
    integerPart %= 1000;
  }

  // Hundreds and units (< 1,000)
  if (integerPart > 0) {
    words += convertThreeDigits(integerPart) + ' ';
  }

  words = words.trim();
  let result = words ? 'Rupees ' + words : '';

  if (paise > 0) {
    const paiseWords = convertTwoDigits(paise) + ' Paise';
    if (result) {
      result += ' and ' + paiseWords;
    } else {
      result = 'Rupees Zero and ' + paiseWords;
    }
  }

  return (result + ' Only').trim();
}

/**
 * Formats a number to standard Indian Currency Format
 * e.g. 1250000 -> "₹ 12,50,000.00"
 * @param {number|string} amount 
 * @returns {string}
 */
export function formatIndianCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '₹ 0.00';
  const num = Number(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}
