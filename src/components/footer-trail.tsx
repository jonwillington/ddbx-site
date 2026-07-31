/** The band field behind the footer.
 *
 *  Broad tonal bands raking across the bottom of every page, with the footer
 *  box sitting on them as a raised sheet. Two earlier attempts lived here — a
 *  perspective floor grid and a field of ticks — and both failed the same way:
 *  they were small-scale textures pinned under the box, when what the bottom of
 *  the page wanted was something at the scale of the page itself.
 *
 *  Notes for anyone retuning it:
 *
 *  - **Bands are filled areas between two curves, not thick strokes.** A stroke
 *    would have to survive whatever scaling the container imposes; a filled
 *    band carries its own geometry, so the thickness stays exactly as drawn.
 *  - **Thickness tapers along each band** and each one has its own rise and
 *    bow, so the field reads as drawn rather than as extruded wallpaper. Purely
 *    parallel bands of constant weight look like a CSS repeating-gradient,
 *    which is what this is trying not to be.
 *  - **Bands are translucent and allowed to overlap** (the gap can go negative)
 *    so intersections compound into tones that aren't in the palette. That's
 *    where most of the depth comes from — four fills, many more apparent
 *    values.
 *  - **Fixed 2600 × 820, anchored bottom-centre, not stretched.** The footer's
 *    height varies a lot between a desktop five-column nav and a stacked phone
 *    one; stretching would swing the rake angle with it. At fixed size the
 *    angle is constant everywhere and a bigger viewport just reveals more. The
 *    mask fades the top 260px in px units for the same reason — it has to line
 *    up with the artwork, not with the wrapper.
 *
 *  Geometry is baked from the generator rather than computed on the client.
 */
export function FooterTrail() {
  return (
    <div aria-hidden="true" className="footer-trail">
      <style>{`
        .footer-trail {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          /* px-based, measured from the bottom, so it tracks the artwork rather
             than the footer's very variable height. Has to be restated with the
             artwork's scale below — the two are one measurement. */
          -webkit-mask-image: linear-gradient(to top, #000 0, #000 280px, transparent 400px);
          mask-image: linear-gradient(to top, #000 0, #000 280px, transparent 400px);
        }
        .footer-trail-art {
          position: absolute;
          bottom: 0;
          left: 50%;
          margin-left: -1300px;
          display: block;
          /* A phone only sees ~430 of the field's 2600px, which is a band and a
             half — not a composition. Halving it shows twice the width at half
             the weight, which is the right proportion for the screen anyway. */
          transform: scale(0.5);
          transform-origin: bottom center;
        }
        @media (min-width: 768px) {
          .footer-trail {
            -webkit-mask-image: linear-gradient(to top, #000 0, #000 560px, transparent 800px);
            mask-image: linear-gradient(to top, #000 0, #000 560px, transparent 800px);
          }
          .footer-trail-art { transform: none; }
        }
        .footer-trail-art path { stroke: none; }
        .footer-trail-art .t1 { fill: #e9e1d4; }
        .footer-trail-art .t2 { fill: #ded2c0; }
        .footer-trail-art .t3 { fill: #d0c2ac; }
        .footer-trail-art .tl { fill: #fdfbf7; }
        /* Dark values sit much closer together: the same tonal spread that
           reads as soft strata on cream reads as slabs on a near-black page. */
        :is(.dark) .footer-trail-art .t1 { fill: #1d1813; }
        :is(.dark) .footer-trail-art .t2 { fill: #241e18; }
        :is(.dark) .footer-trail-art .t3 { fill: #2c241c; }
        :is(.dark) .footer-trail-art .tl { fill: #342a20; }
      `}</style>
      <svg
        className="footer-trail-art"
        height="820"
        viewBox="0 0 2600 820"
        width="2600"
      >
        <path
          className="t3"
          d="M0 17Q325 8 488 2Q650 -5 813 -14Q975 -23 1138 -35Q1300 -48 1463 -65Q1625 -82 1788 -102Q1950 -123 2113 -146Q2275 -170 2438 -194L2600 -219L2600 -212Q2275 -163 2113 -140Q1950 -117 1788 -96Q1625 -76 1463 -59Q1300 -42 1138 -29Q975 -17 813 -8Q650 1 488 7Q325 13 163 18L0 23Z"
          opacity="0.65"
        />
        <path
          className="t1"
          d="M0 30Q325 4 488 -9Q650 -23 813 -38Q975 -53 1138 -70Q1300 -87 1463 -105Q1625 -124 1788 -144Q1950 -165 2113 -187Q2275 -209 2438 -231L2600 -254L2600 -244Q2275 -199 2113 -177Q1950 -155 1788 -134Q1625 -113 1463 -94Q1300 -75 1138 -58Q975 -41 813 -26Q650 -11 488 3Q325 17 163 30L0 43Z"
          opacity="0.83"
        />
        <path
          className="t2"
          d="M0 53Q325 11 488 -9Q650 -30 813 -49Q975 -68 1138 -85Q1300 -103 1463 -119Q1625 -135 1788 -149Q1950 -163 2113 -176Q2275 -189 2438 -201L2600 -214L2600 -204Q2275 -179 2113 -166Q1950 -153 1788 -139Q1625 -125 1463 -109Q1300 -93 1138 -75Q975 -58 813 -39Q650 -20 488 1Q325 21 163 42L0 63Z"
          opacity="0.94"
        />
        <path
          className="t2"
          d="M0 30Q325 -14 488 -35Q650 -56 813 -75Q975 -94 1138 -110Q1300 -126 1463 -139Q1625 -152 1788 -162Q1950 -173 2113 -181Q2275 -190 2438 -197L2600 -204L2600 -163Q2275 -145 2113 -135Q1950 -125 1788 -112Q1625 -100 1463 -85Q1300 -70 1138 -52Q975 -35 813 -14Q650 7 488 30Q325 52 163 76L0 100Z"
          opacity="0.72"
        />
        <path
          className="t3"
          d="M0 118Q325 80 488 61Q650 42 813 23Q975 3 1138 -17Q1300 -37 1463 -57Q1625 -78 1788 -98Q1950 -119 2113 -140Q2275 -162 2438 -183L2600 -204L2600 -197Q2275 -154 2113 -133Q1950 -112 1788 -91Q1625 -71 1463 -50Q1300 -30 1138 -10Q975 9 813 29Q650 48 488 67Q325 86 163 105L0 124Z"
          opacity="0.93"
        />
        <path
          className="t2"
          d="M0 109Q325 52 488 25Q650 -2 813 -26Q975 -50 1138 -70Q1300 -91 1463 -108Q1625 -125 1788 -138Q1950 -151 2113 -161Q2275 -172 2438 -181L2600 -190L2600 -145Q2275 -123 2113 -110Q1950 -98 1788 -83Q1625 -68 1463 -49Q1300 -31 1138 -8Q975 14 813 40Q650 65 488 94Q325 123 163 153L0 183Z"
          opacity="0.66"
        />
        <path
          className="t2"
          d="M0 163Q325 119 488 98Q650 76 813 56Q975 35 1138 15Q1300 -5 1463 -23Q1625 -42 1788 -59Q1950 -77 2113 -94Q2275 -111 2438 -127L2600 -144L2600 -137Q2275 -104 2113 -87Q1950 -70 1788 -52Q1625 -35 1463 -16Q1300 2 1138 22Q975 42 813 63Q650 83 488 105Q325 127 163 149L0 171Z"
          opacity="0.92"
        />
        <path
          className="t1"
          d="M0 171Q325 133 488 115Q650 97 813 80Q975 62 1138 46Q1300 29 1463 14Q1625 -2 1788 -16Q1950 -30 2113 -43Q2275 -56 2438 -69L2600 -82L2600 -53Q2275 -25 2113 -10Q1950 4 1788 20Q1625 35 1463 52Q1300 68 1138 86Q975 103 813 122Q650 141 488 161Q325 180 163 200L0 220Z"
          opacity="0.91"
        />
        <path
          className="t3"
          d="M0 215Q325 171 488 150Q650 129 813 109Q975 89 1138 71Q1300 52 1463 35Q1625 17 1788 1Q1950 -16 2113 -31Q2275 -46 2438 -60L2600 -75L2600 -69Q2275 -39 2113 -23Q1950 -8 1788 9Q1625 26 1463 44Q1300 61 1138 81Q975 100 813 121Q650 141 488 163Q325 184 163 206L0 228Z"
          opacity="0.91"
        />
        <path
          className="t3"
          d="M0 211Q325 193 488 183Q650 173 813 161Q975 148 1138 132Q1300 116 1463 97Q1625 78 1788 55Q1950 32 2113 7Q2275 -18 2438 -44L2600 -70L2600 -34Q2275 22 2113 49Q1950 76 1788 101Q1625 125 1463 146Q1300 167 1138 185Q975 202 813 217Q650 231 488 243Q325 255 163 266L0 276Z"
          opacity="0.77"
        />
        <path
          className="tl"
          d="M0 282Q325 244 488 225Q650 206 813 186Q975 166 1138 146Q1300 125 1463 104Q1625 82 1788 60Q1950 38 2113 15Q2275 -8 2438 -31L2600 -54L2600 32Q2275 73 2113 93Q1950 113 1788 132Q1625 151 1463 170Q1300 189 1138 207Q975 224 813 241Q650 258 488 275Q325 292 163 308L0 324Z"
          opacity="0.72"
        />
        <path
          className="t3"
          d="M0 364Q325 321 488 301Q650 280 813 260Q975 240 1138 222Q1300 203 1463 187Q1625 170 1788 154Q1950 138 2113 124Q2275 109 2438 95L2600 81L2600 88Q2275 116 2113 131Q1950 145 1788 161Q1625 176 1463 193Q1300 209 1138 228Q975 246 813 266Q650 285 488 306Q325 326 163 348L0 369Z"
          opacity="0.83"
        />
        <path
          className="t3"
          d="M0 395Q325 353 488 332Q650 311 813 291Q975 270 1138 250Q1300 230 1463 211Q1625 191 1788 172Q1950 153 2113 135Q2275 116 2438 98L2600 79L2600 111Q2275 147 2113 165Q1950 183 1788 202Q1625 220 1463 239Q1300 258 1138 278Q975 298 813 318Q650 338 488 359Q325 379 163 400L0 421Z"
          opacity="0.73"
        />
        <path
          className="tl"
          d="M0 424Q325 375 488 352Q650 329 813 309Q975 288 1138 272Q1300 255 1463 242Q1625 229 1788 221Q1950 212 2113 206Q2275 199 2438 195L2600 190L2600 205Q2275 213 2113 219Q1950 225 1788 234Q1625 242 1463 254Q1300 266 1138 282Q975 298 813 318Q650 338 488 361Q325 383 163 408L0 432Z"
          opacity="0.77"
        />
        <path
          className="t2"
          d="M0 414Q325 385 488 370Q650 355 813 339Q975 323 1138 305Q1300 287 1463 267Q1625 247 1788 226Q1950 204 2113 182Q2275 159 2438 136L2600 112L2600 158Q2275 202 2113 223Q1950 244 1788 264Q1625 284 1463 302Q1300 320 1138 337Q975 353 813 368Q650 383 488 396Q325 409 163 422L0 435Z"
          opacity="0.94"
        />
        <path
          className="tl"
          d="M0 433Q325 412 488 400Q650 388 813 375Q975 361 1138 345Q1300 329 1463 311Q1625 292 1788 271Q1950 249 2113 226Q2275 202 2438 178L2600 153L2600 189Q2275 241 2113 266Q1950 291 1788 314Q1625 337 1463 358Q1300 378 1138 396Q975 414 813 429Q650 444 488 457Q325 470 163 483L0 495Z"
          opacity="0.70"
        />
        <path
          className="tl"
          d="M0 503Q325 457 488 435Q650 413 813 393Q975 372 1138 354Q1300 335 1463 320Q1625 304 1788 291Q1950 277 2113 265Q2275 253 2438 243L2600 232L2600 242Q2275 264 2113 276Q1950 287 1788 300Q1625 313 1463 329Q1300 344 1138 362Q975 380 813 400Q650 420 488 442Q325 464 163 487L0 510Z"
          opacity="0.82"
        />
        <path
          className="t2"
          d="M0 512Q325 482 488 467Q650 452 813 435Q975 418 1138 400Q1300 381 1463 361Q1625 340 1788 318Q1950 295 2113 271Q2275 247 2438 223L2600 198L2600 288Q2275 331 2113 352Q1950 373 1788 393Q1625 412 1463 430Q1300 448 1138 464Q975 479 813 493Q650 507 488 520Q325 532 163 544L0 556Z"
          opacity="0.56"
        />
        <path
          className="t2"
          d="M0 563Q325 511 488 486Q650 460 813 437Q975 413 1138 392Q1300 371 1463 352Q1625 333 1788 317Q1950 301 2113 287Q2275 272 2438 259L2600 246L2600 296Q2275 322 2113 336Q1950 350 1788 366Q1625 382 1463 401Q1300 419 1138 440Q975 460 813 484Q650 507 488 532Q325 557 163 583L0 609Z"
          opacity="0.71"
        />
        <path
          className="t1"
          d="M0 602Q325 567 488 550Q650 533 813 516Q975 498 1138 481Q1300 464 1463 447Q1625 430 1788 414Q1950 397 2113 381Q2275 364 2438 348L2600 331L2600 340Q2275 374 2113 391Q1950 408 1788 425Q1625 442 1463 459Q1300 476 1138 494Q975 511 813 529Q650 546 488 564Q325 581 163 599L0 617Z"
          opacity="0.54"
        />
        <path
          className="t1"
          d="M0 602Q325 583 488 572Q650 560 813 546Q975 532 1138 515Q1300 497 1463 476Q1625 454 1788 429Q1950 403 2113 375Q2275 346 2438 316L2600 286L2600 291Q2275 352 2113 381Q1950 409 1788 435Q1625 460 1463 482Q1300 504 1138 522Q975 540 813 555Q650 569 488 581Q325 592 163 602L0 612Z"
          opacity="0.65"
        />
        <path
          className="t3"
          d="M0 609Q325 568 488 549Q650 529 813 510Q975 491 1138 473Q1300 455 1463 439Q1625 422 1788 407Q1950 391 2113 376Q2275 361 2438 347L2600 333L2600 384Q2275 411 2113 425Q1950 438 1788 453Q1625 467 1463 483Q1300 498 1138 515Q975 531 813 549Q650 567 488 586Q325 604 163 623L0 642Z"
          opacity="0.85"
        />
        <path
          className="t3"
          d="M0 635Q325 605 488 590Q650 574 813 559Q975 543 1138 527Q1300 510 1463 494Q1625 477 1788 460Q1950 442 2113 425Q2275 407 2438 390L2600 372L2600 412Q2275 450 2113 469Q1950 487 1788 505Q1625 523 1463 541Q1300 559 1138 576Q975 593 813 610Q650 626 488 643Q325 659 163 675L0 691Z"
          opacity="0.84"
        />
        <path
          className="t2"
          d="M0 676Q325 651 488 637Q650 623 813 607Q975 591 1138 573Q1300 555 1463 534Q1625 513 1788 489Q1950 465 2113 440Q2275 414 2438 388L2600 361L2600 375Q2275 428 2113 454Q1950 479 1788 502Q1625 525 1463 546Q1300 567 1138 585Q975 603 813 619Q650 634 488 648Q325 661 163 674L0 686Z"
          opacity="0.63"
        />
        <path
          className="t2"
          d="M0 719Q325 684 488 667Q650 650 813 633Q975 615 1138 599Q1300 582 1463 565Q1625 548 1788 532Q1950 515 2113 499Q2275 482 2438 466L2600 450L2600 465Q2275 497 2113 513Q1950 529 1788 545Q1625 561 1463 578Q1300 594 1138 611Q975 627 813 644Q650 660 488 677Q325 694 163 711L0 728Z"
          opacity="0.94"
        />
        <path
          className="tl"
          d="M0 735Q325 704 488 688Q650 672 813 657Q975 641 1138 625Q1300 608 1463 592Q1625 575 1788 559Q1950 542 2113 525Q2275 508 2438 491L2600 474L2600 492Q2275 527 2113 545Q1950 562 1788 579Q1625 596 1463 613Q1300 629 1138 646Q975 663 813 679Q650 695 488 711Q325 727 163 743L0 759Z"
          opacity="0.74"
        />
      </svg>
    </div>
  );
}
