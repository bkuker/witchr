; Generate logarithms using Horner's method for calculating the Taylor series expansion.
;
; Authot: Trevor R.H. Clarke <retrev@csh.rit.edu>
;
;
; log10 LUT generator, using log10(X) = E + (2/ln(10)) * atanh-series.
; Input stores:
; 10=X
; 20=highest X
; 21=X increment.

; Result:
; 90=current log10(X).
; Output (pick one, see OUTPUT SELECT in block 6 and PUNCH trailer in block 9):
;   Printer 1: X, log10(X), ln(X) on each line.  (default)
;   Perforator 1: X, log10(X) per entry, then 5 blank rows.
;   Perforator 1: X, ln(X) per entry, then 5 blank rows.
;
; Work stores:
; 30=E
; 40=Y
; 50=DEN
; 60=Z
; 70=Q
; 80=P.
;
; Constants are read inline from tape 1, directly after the order that uses them.
; 20900 clears ACC: ADD and CLEAR ACC to drain

tape1(looped)

[1]
; Inputs
21000
10110
+0.6250000

22000
10120
+9.3750000

22100
10121
+0.6000000

[2]
; Stop when X > X_MAX.
20900 ; clear ACC to drain
11009 ; ACC = X
32009 ; ACC = X - X_MAX
01109 ; SIGN-TEST+: test whether X-X_MAX is positive
05901 ; IF positive: SEARCH block 9 on tape 1
20900 ; clear ACC to drain

; Y = X.
24000 ; clear Y into drain
20900 ; clear ACC to drain
11009 ; ACC = X
10940 ; Y = ACC
20900 ; clear ACC to drain

; E = 0.
23000 ; clear E into drain
20900 ; clear ACC to drain
03301 ; SEARCH block 3 on tape 1

[3]
; WHILE Y >= sqrt(10): Y = 0.1*Y; E = E+1.
14009 ; ACC = Y
30109 ; ACC = Y-sqrt(10)
+3.1622777
01109 ; SIGN-TEST+: test Y-sqrt(10)
05401 ; IF positive: SEARCH block 4 on tape 1
20900 ; clear ACC to drain

; WHILE Y < 1/sqrt(10): Y = 10*Y; E = E-1.
10109 ; ACC = 1/sqrt(10)
+0.3162278
34009 ; ACC = 1/sqrt(10)-Y
01109 ; SIGN-TEST+: test 1/sqrt(10)-Y
05501 ; IF positive: SEARCH block 5 on tape 1
20900 ; clear ACC to drain
03601 ; SEARCH block 6 on tape 1

[4]
; Y = Y*0.1, using a one-shot decimal shift C.
20900 ; clear ACC to drain (holds the test value)
08300 ; SET-SHIFT C: multiply next operation by 10^-1
14009 ; ACC = 0.1*Y
24000 ; clear Y into drain
10940 ; Y = ACC
20900 ; clear ACC to drain
; E = E+1.
10130 ; ACC = +1; E += ACC
+1.0000000
20900 ; clear ACC to drain
03301 ; SEARCH block 3 on tape 1

[5]
; Y = Y*10, using a one-shot decimal shift A.
20900 ; clear ACC to drain (holds the test value)
08100 ; SET-SHIFT A: multiply next operation by 10
14009 ; ACC = 10*Y
24000 ; clear Y into drain
10940 ; Y = ACC
20900 ; clear ACC to drain
; E = E-1.
10130 ; ACC = -1; E += ACC
-1.0000000
20900 ; clear ACC to drain
03301 ; SEARCH block 3 on tape 1

[6]
; Z = (Y-1)/(Y+1).
25000 ; clear DEN into drain
20900 ; clear ACC to drain
14009 ; ACC = Y
10109 ; ACC = Y+1
+1.0000000
10950 ; DEN = ACC
20900 ; clear ACC to drain
14009 ; ACC = Y
30109 ; ACC = Y-1
+1.0000000
26000 ; clear Z (divide needs a cleared quotient store)
65060 ; Z = ACC/DEN; ACC = remainder
20900 ; clear ACC to drain

; Q = Z*Z.
27000 ; clear Q into drain
20900 ; clear ACC to drain
16009 ; ACC = Z
10970 ; Q = ACC
20900 ; clear ACC to drain
56070 ; ACC = Z*Q; Q = 0
10970 ; Q = ACC
20900 ; clear ACC to drain

; P = 1/21.
28000 ; clear P into drain
20900 ; clear ACC to drain
10180 ; ACC = 1/21; P = ACC
+0.0476190
20900 ; clear ACC to drain

; P = 1/19 + Q*P.
57080 ; ACC = Q*P; P = 0
10109 ; ACC += 1/19
+0.0526316
10980 ; P = ACC
20900 ; clear ACC to drain
; P = 1/17 + Q*P.
57080 ; ACC = Q*P; P = 0
10109 ; ACC += 1/17
+0.0588235
10980 ; P = ACC
20900 ; clear ACC to drain
; P = 1/15 + Q*P.
57080 ; ACC = Q*P; P = 0
10109 ; ACC += 1/15
+0.0666667
10980 ; P = ACC
20900 ; clear ACC to drain
; P = 1/13 + Q*P.
57080 ; ACC = Q*P; P = 0
10109 ; ACC += 1/13
+0.0769231
10980 ; P = ACC
20900 ; clear ACC to drain
; P = 1/11 + Q*P.
57080 ; ACC = Q*P; P = 0
10109 ; ACC += 1/11
+0.0909091
10980 ; P = ACC
20900 ; clear ACC to drain
; P = 1/9 + Q*P.
57080 ; ACC = Q*P; P = 0
10109 ; ACC += 1/9
+0.1111111
10980 ; P = ACC
20900 ; clear ACC to drain
; P = 1/7 + Q*P.
57080 ; ACC = Q*P; P = 0
10109 ; ACC += 1/7
+0.1428571
10980 ; P = ACC
20900 ; clear ACC to drain
; P = 1/5 + Q*P.
57080 ; ACC = Q*P; P = 0
10109 ; ACC += 1/5
+0.2000000
10980 ; P = ACC
20900 ; clear ACC to drain
; P = 1/3 + Q*P.
57080 ; ACC = Q*P; P = 0
10109 ; ACC += 1/3
+0.3333333
10980 ; P = ACC
20900 ; clear ACC to drain
; P = 1 + Q*P.
57080 ; ACC = Q*P; P = 0
10109 ; ACC += 1
+1.0000000
10980 ; P = ACC
20900 ; clear ACC to drain

; ACC = Z*P*(2/ln(10)).
56080 ; ACC = Z*P; P = 0
10980 ; P = ACC
20900 ; clear ACC to drain
27000 ; clear Q into drain
10170 ; Q = 2/ln(10)
+0.8685890
58070 ; ACC = P*(2/ln(10)); Q = 0

; Add E, clear the prior RESULT, store and print.
13009 ; ACC += E
29000 ; clear RESULT into drain
10990 ; RESULT = ACC
20900 ; clear ACC to drain

; ===== OUTPUT SELECT (1 of 3): PRINTER =====
; Uncomment this section for printer output; comment it out for either punch option.
07300 ; LAYOUT: print 8 digits, first/mid column
11001 ; print X on printer 1
07300 ; LAYOUT: print 8 digits, first/mid column
19001 ; print log10(X) on printer 1
; ln(X) = log10(X) * ln(10).  Q was cleared by the multiply above.
10170 ; Q = ln(10)
+2.3025851
59070 ; ACC = RESULT*ln(10); Q = 0
07400 ; LAYOUT: print 8 digits, last on line
10901 ; print ln(X) on printer 1
20900 ; clear ACC to drain
; ===== END PRINTER =====

; ===== OUTPUT SELECT (2 of 3): PUNCH log10 =====
; Uncomment this section for punch tape output (X, log10(X) per entry);
; also uncomment the PUNCH trailer in block 9.
;07100 ; LAYOUT: punch 8 digits
;11002 ; punch X on perforator 1
;07100 ; LAYOUT: punch 8 digits
;19002 ; punch log10(X) on perforator 1
; ===== END PUNCH log10 =====

; ===== OUTPUT SELECT (3 of 3): PUNCH ln =====
; Uncomment this section for punch tape output (X, ln(X) per entry);
; also uncomment the PUNCH trailer in block 9.
; ln(X) = log10(X) * ln(10).  Q was cleared by the multiply above.
;07100 ; LAYOUT: punch 8 digits
;11002 ; punch X on perforator 1
;10170 ; Q = ln(10)
;+2.3025851
;59070 ; ACC = RESULT*ln(10); Q = 0
;07100 ; LAYOUT: punch 8 digits
;10902 ; punch ln(X) on perforator 1
;20900 ; clear ACC to drain
; ===== END PUNCH ln =====

; X = X + X_STEP.
12110 ; ACC = X_STEP; X += ACC
20900 ; clear ACC to drain
03201 ; SEARCH block 2 on tape 1

[9]
; ===== PUNCH trailer: uncomment with either PUNCH section in block 6 =====
;07000 ; LAYOUT: feed 5 blank rows
;10902 ; feed blanks on perforator 1 (ACC value ignored)
; ===== END PUNCH trailer =====
00100 ; FINISH

; Test vectors: 15 points, X = 0.625 + 0.6*k for k = 0..14 (0.625 .. 9.025),
; expected log10(X) rounded to 7 decimals.
; expect halt: FINISH
; expect output: -0.2041200
; expect output: +0.0881361
; expect output: +0.2612629
; expect output: +0.3847117
; expect output: +0.4807254
; expect output: +0.5593080
; expect output: +0.6258267
; expect output: +0.6834973
; expect output: +0.7343997
; expect output: +0.7799571
; expect output: +0.8211859
; expect output: +0.8588379
; expect output: +0.8934843
; expect output: +0.9255699
; expect output: +0.9554472
