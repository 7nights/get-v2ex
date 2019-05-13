/**
 * Add helper strings to easily locate a balance group.
 * @param {string} input String to be transformed. 
 * @param {string} start Start of the group. 
 * @param {string} end End of the group.
 * @param {string} newStart Use $no to be the placeholder of order number.
 * @param {string} newEnd
 */
function addBalance(input, start, end, newStart, newEnd) {
  let n = 0;
  const reg = new RegExp(`(${start}|${end})`, 'g');
  return input.replace(reg, ($0, $1) => {
    if ($1 === start) {
      return newStart.replace(/\$no/, ++n);
    } else if ($1 === end) {
      if (n === 0) return $0;
      return newEnd.replace(/\$no/, n--);
    }
  });
}

function getBalanceGroup(input, start, end, newStart, newEnd, number) {
  let _newStart = newStart.replace(/\$no/, number);
  let _newEnd = newEnd.replace(/\$no/, number);
  let m = input.match(new RegExp(`${_newStart}[\\s\\S]*?${_newEnd}`, 'g'));
  if (m) {
    m = m.map((val) => {
      val = val.replace(new RegExp(`${newStart.replace(/\$no/, '([0-9]*?)')}`, 'g'), start);
      val = val.replace(new RegExp(`${newEnd.replace(/\$no/, '([0-9]*?)')}`, 'g'), end);
      return val;
    });
  }
  return m;
}

class BalanceGroup {
  constructor(input, start, end, newStart, newEnd) {
    this.input = input;
    this.start = start;
    this.end = end;
    this.newStart = newStart;
    this.newEnd = newEnd;
    this._balanceGroup = [];

    this.addBalance();
  }
  addBalance() {
    this._balance = addBalance(this.input, this.start, this.end, this.newStart, this.newEnd);
    return this._balance;
  }
  getBalanceGroup(number) {
    this._balanceGroup[number] = getBalanceGroup(this._balance, this.start, this.end, this.newStart, this.newEnd, number);
    return this._balanceGroup[number];
  }
}

module.exports = BalanceGroup;
