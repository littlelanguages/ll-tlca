import * as AbstractScanner from "https://raw.githubusercontent.com/littlelanguages/scanpiler-deno-lib/0.1.1/abstract-scanner.ts";

export type Token = AbstractScanner.Token<TToken>;

export class Scanner extends AbstractScanner.Scanner<TToken> {
  constructor(input: string) {
    super(input, TToken.ERROR);
  }

  next() {
    if (this.currentToken[0] !== TToken.EOS) {
      while (0 <= this.nextCh && this.nextCh <= 32) {
        this.nextChar();
      }

      let state = 0;
      while (true) {
        switch (state) {
          case 0: {
            if (this.nextCh === 100) {
              this.markAndNextChar();
              state = 1;
              break;
            } else if (this.nextCh === 61) {
              this.markAndNextChar();
              state = 2;
              break;
            } else if (this.nextCh === 124) {
              this.markAndNextChar();
              state = 3;
              break;
            } else if (this.nextCh === 119) {
              this.markAndNextChar();
              state = 4;
              break;
            } else if (this.nextCh === 109) {
              this.markAndNextChar();
              state = 5;
              break;
            } else if (this.nextCh === 101) {
              this.markAndNextChar();
              state = 6;
              break;
            } else if (this.nextCh === 105) {
              this.markAndNextChar();
              state = 7;
              break;
            } else if (this.nextCh === 97) {
              this.markAndNextChar();
              state = 8;
              break;
            } else if (this.nextCh === 114) {
              this.markAndNextChar();
              state = 9;
              break;
            } else if (this.nextCh === 108) {
              this.markAndNextChar();
              state = 10;
              break;
            } else if (this.nextCh === 45) {
              this.markAndNextChar();
              state = 11;
              break;
            } else if (this.nextCh === 92) {
              this.markAndNextChar();
              state = 12;
              break;
            } else if (this.nextCh === 70) {
              this.markAndNextChar();
              state = 13;
              break;
            } else if (this.nextCh === 84) {
              this.markAndNextChar();
              state = 14;
              break;
            } else if (this.nextCh === 41) {
              this.markAndNextChar();
              state = 15;
              break;
            } else if (this.nextCh === 44) {
              this.markAndNextChar();
              state = 16;
              break;
            } else if (this.nextCh === 40) {
              this.markAndNextChar();
              state = 17;
              break;
            } else if (this.nextCh === 47) {
              this.markAndNextChar();
              state = 18;
              break;
            } else if (this.nextCh === 42) {
              this.markAndNextChar();
              state = 19;
              break;
            } else if (this.nextCh === 43) {
              this.markAndNextChar();
              state = 20;
              break;
            } else if (this.nextCh === 59) {
              this.markAndNextChar();
              state = 21;
              break;
            } else if (
              65 <= this.nextCh && this.nextCh <= 69 ||
              71 <= this.nextCh && this.nextCh <= 83 ||
              85 <= this.nextCh && this.nextCh <= 90
            ) {
              this.markAndNextChar();
              state = 22;
              break;
            } else if (
              this.nextCh === 95 || this.nextCh === 98 || this.nextCh === 99 ||
              102 <= this.nextCh && this.nextCh <= 104 || this.nextCh === 106 ||
              this.nextCh === 107 || 110 <= this.nextCh && this.nextCh <= 113 ||
              115 <= this.nextCh && this.nextCh <= 118 ||
              120 <= this.nextCh && this.nextCh <= 122
            ) {
              this.markAndNextChar();
              state = 23;
              break;
            } else if (this.nextCh === 34) {
              this.markAndNextChar();
              state = 24;
              break;
            } else if (this.nextCh === -1) {
              this.markAndNextChar();
              state = 25;
              break;
            } else if (48 <= this.nextCh && this.nextCh <= 57) {
              this.markAndNextChar();
              state = 26;
              break;
            } else {
              this.markAndNextChar();
              this.attemptBacktrackOtherwise(TToken.ERROR);
              return;
            }
          }
          case 1: {
            if (this.nextCh === 97) {
              this.nextChar();
              state = 27;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              98 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 2: {
            if (this.nextCh === 61) {
              this.nextChar();
              state = 28;
              break;
            } else {
              this.setToken(1);
              return;
            }
          }
          case 3: {
            this.setToken(2);
            return;
          }
          case 4: {
            if (this.nextCh === 105) {
              this.nextChar();
              state = 29;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 104 ||
              106 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 5: {
            if (this.nextCh === 97) {
              this.nextChar();
              state = 30;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              98 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 6: {
            if (this.nextCh === 108) {
              this.nextChar();
              state = 31;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 107 ||
              109 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 7: {
            if (this.nextCh === 102) {
              this.nextChar();
              state = 32;
              break;
            } else if (this.nextCh === 110) {
              this.nextChar();
              state = 33;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 101 ||
              103 <= this.nextCh && this.nextCh <= 109 ||
              111 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 8: {
            if (this.nextCh === 110) {
              this.nextChar();
              state = 34;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 109 ||
              111 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 9: {
            if (this.nextCh === 101) {
              this.nextChar();
              state = 35;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 100 ||
              102 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 10: {
            if (this.nextCh === 101) {
              this.nextChar();
              state = 36;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 100 ||
              102 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 11: {
            if (this.nextCh === 62) {
              this.nextChar();
              state = 37;
              break;
            } else if (48 <= this.nextCh && this.nextCh <= 57) {
              this.nextChar();
              state = 26;
              break;
            } else if (this.nextCh === 45) {
              this.nextChar();
              state = 38;
              break;
            } else {
              this.setToken(20);
              return;
            }
          }
          case 12: {
            this.setToken(12);
            return;
          }
          case 13: {
            if (this.nextCh === 97) {
              this.nextChar();
              state = 39;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              98 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 22;
              break;
            } else {
              this.setToken(24);
              return;
            }
          }
          case 14: {
            if (this.nextCh === 114) {
              this.nextChar();
              state = 40;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 113 ||
              115 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 22;
              break;
            } else {
              this.setToken(24);
              return;
            }
          }
          case 15: {
            this.setToken(15);
            return;
          }
          case 16: {
            this.setToken(16);
            return;
          }
          case 17: {
            this.setToken(17);
            return;
          }
          case 18: {
            this.setToken(18);
            return;
          }
          case 19: {
            this.setToken(19);
            return;
          }
          case 20: {
            this.setToken(21);
            return;
          }
          case 21: {
            this.setToken(23);
            return;
          }
          case 22: {
            if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 22;
              break;
            } else {
              this.setToken(24);
              return;
            }
          }
          case 23: {
            if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 24: {
            if (
              0 <= this.nextCh && this.nextCh <= 9 ||
              11 <= this.nextCh && this.nextCh <= 33 ||
              35 <= this.nextCh && this.nextCh <= 91 ||
              93 <= this.nextCh && this.nextCh <= 255
            ) {
              this.nextChar();
              state = 24;
              break;
            } else if (this.nextCh === 92) {
              this.nextChar();
              state = 41;
              break;
            } else if (this.nextCh === 34) {
              this.nextChar();
              state = 42;
              break;
            } else {
              this.attemptBacktrackOtherwise(TToken.ERROR);
              return;
            }
          }
          case 25: {
            this.setToken(28);
            return;
          }
          case 26: {
            if (48 <= this.nextCh && this.nextCh <= 57) {
              this.nextChar();
              state = 26;
              break;
            } else {
              this.setToken(26);
              return;
            }
          }
          case 27: {
            if (this.nextCh === 116) {
              this.nextChar();
              state = 43;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 115 ||
              117 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 28: {
            this.setToken(22);
            return;
          }
          case 29: {
            if (this.nextCh === 116) {
              this.nextChar();
              state = 44;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 115 ||
              117 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 30: {
            if (this.nextCh === 116) {
              this.nextChar();
              state = 45;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 115 ||
              117 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 31: {
            if (this.nextCh === 115) {
              this.nextChar();
              state = 46;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 114 ||
              116 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 32: {
            if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(6);
              return;
            }
          }
          case 33: {
            if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(7);
              return;
            }
          }
          case 34: {
            if (this.nextCh === 100) {
              this.nextChar();
              state = 47;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 99 ||
              101 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 35: {
            if (this.nextCh === 99) {
              this.nextChar();
              state = 48;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              this.nextCh === 97 || this.nextCh === 98 ||
              100 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 36: {
            if (this.nextCh === 116) {
              this.nextChar();
              state = 49;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 115 ||
              117 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 37: {
            this.setToken(11);
            return;
          }
          case 38: {
            if (
              0 <= this.nextCh && this.nextCh <= 9 ||
              11 <= this.nextCh && this.nextCh <= 255
            ) {
              this.nextChar();
              state = 38;
              break;
            } else {
              this.next();
              return;
            }
          }
          case 39: {
            if (this.nextCh === 108) {
              this.nextChar();
              state = 50;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 107 ||
              109 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 22;
              break;
            } else {
              this.setToken(24);
              return;
            }
          }
          case 40: {
            if (this.nextCh === 117) {
              this.nextChar();
              state = 51;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 116 ||
              118 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 22;
              break;
            } else {
              this.setToken(24);
              return;
            }
          }
          case 41: {
            if (this.nextCh === 34) {
              this.nextChar();
              state = 52;
              break;
            } else if (
              0 <= this.nextCh && this.nextCh <= 9 ||
              11 <= this.nextCh && this.nextCh <= 33 ||
              35 <= this.nextCh && this.nextCh <= 91 ||
              93 <= this.nextCh && this.nextCh <= 255
            ) {
              this.nextChar();
              state = 24;
              break;
            } else if (this.nextCh === 92) {
              this.nextChar();
              state = 41;
              break;
            } else {
              this.attemptBacktrackOtherwise(TToken.ERROR);
              return;
            }
          }
          case 42: {
            this.setToken(27);
            return;
          }
          case 43: {
            if (this.nextCh === 97) {
              this.nextChar();
              state = 53;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              98 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 44: {
            if (this.nextCh === 104) {
              this.nextChar();
              state = 54;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 103 ||
              105 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 45: {
            if (this.nextCh === 99) {
              this.nextChar();
              state = 55;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              this.nextCh === 97 || this.nextCh === 98 ||
              100 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 46: {
            if (this.nextCh === 101) {
              this.nextChar();
              state = 56;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 100 ||
              102 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 47: {
            if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(8);
              return;
            }
          }
          case 48: {
            if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(9);
              return;
            }
          }
          case 49: {
            if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(10);
              return;
            }
          }
          case 50: {
            if (this.nextCh === 115) {
              this.nextChar();
              state = 57;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 114 ||
              116 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 22;
              break;
            } else {
              this.setToken(24);
              return;
            }
          }
          case 51: {
            if (this.nextCh === 101) {
              this.nextChar();
              state = 58;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 100 ||
              102 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 22;
              break;
            } else {
              this.setToken(24);
              return;
            }
          }
          case 52: {
            if (this.nextCh === 34) {
              this.nextChar();
              state = 42;
              break;
            } else if (
              0 <= this.nextCh && this.nextCh <= 9 ||
              11 <= this.nextCh && this.nextCh <= 33 ||
              35 <= this.nextCh && this.nextCh <= 91 ||
              93 <= this.nextCh && this.nextCh <= 255
            ) {
              this.markBacktrackPoint(27);
              this.nextChar();
              state = 24;
              break;
            } else if (this.nextCh === 92) {
              this.markBacktrackPoint(27);
              this.nextChar();
              state = 41;
              break;
            } else {
              this.setToken(27);
              return;
            }
          }
          case 53: {
            if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(0);
              return;
            }
          }
          case 54: {
            if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(3);
              return;
            }
          }
          case 55: {
            if (this.nextCh === 104) {
              this.nextChar();
              state = 59;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 103 ||
              105 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(25);
              return;
            }
          }
          case 56: {
            if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(5);
              return;
            }
          }
          case 57: {
            if (this.nextCh === 101) {
              this.nextChar();
              state = 60;
              break;
            } else if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 100 ||
              102 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 22;
              break;
            } else {
              this.setToken(24);
              return;
            }
          }
          case 58: {
            if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 22;
              break;
            } else {
              this.setToken(14);
              return;
            }
          }
          case 59: {
            if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 23;
              break;
            } else {
              this.setToken(4);
              return;
            }
          }
          case 60: {
            if (
              48 <= this.nextCh && this.nextCh <= 57 ||
              65 <= this.nextCh && this.nextCh <= 90 || this.nextCh === 95 ||
              97 <= this.nextCh && this.nextCh <= 122
            ) {
              this.nextChar();
              state = 22;
              break;
            } else {
              this.setToken(13);
              return;
            }
          }
        }
      }
    }
  }
}

export function mkScanner(input: string): Scanner {
  return new Scanner(input);
}

export enum TToken {
  Data,
  Equal,
  Bar,
  With,
  Match,
  Else,
  If,
  In,
  And,
  Rec,
  Let,
  DashGreaterThan,
  Backslash,
  False,
  True,
  RParen,
  Comma,
  LParen,
  Slash,
  Star,
  Dash,
  Plus,
  EqualEqual,
  Semicolon,
  UpperIdentifier,
  LowerIdentifier,
  LiteralInt,
  LiteralString,
  EOS,
  ERROR,
}
