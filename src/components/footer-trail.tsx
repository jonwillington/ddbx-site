/** The sweep pinned to the bottom of every page, under the footer box.
 *
 *  Two bundles of fine strands running in opposite directions — one rising
 *  left-to-right, one falling — that pinch to a waist where they cross and fan
 *  open towards both edges. Buying and selling pressure crossing each other is
 *  the thing this site watches, so the figure is the subject in the abstract;
 *  read it as flow rather than as a chart, because there is nothing in it to
 *  read. It replaced a perspective floor grid (a texture that could have sat
 *  under any site) and then a field of ticks (legible enough to invite being
 *  read as data it wasn't).
 *
 *  Three things that are load-bearing, in case this gets retuned:
 *
 *  - **Strands are spaced by an explicit width envelope, not by scaling one
 *    curve about a pivot.** The scaling trick is far cheaper (one path plus N
 *    <use>) and gives the same silhouette, but it leaves the strands stacked
 *    within a pixel or two of each other over most of the width, where 20
 *    overlapping alphas compound into a solid black smear. Physically
 *    separating them is what keeps this a set of lines.
 *  - **The composition is asymmetric on purpose.** Equal bundles crossing at
 *    the midpoint read as a corporate bowtie; the crossing sits at ~40%, the
 *    rising bundle is wider and louder than the falling one, and `bow` bends
 *    each centre line off a straight interpolation so they aren't mirrors.
 *  - **It stretches to the wrapper (preserveAspectRatio="none").** That's
 *    deliberate: the wrapper is shorter on small screens, so the whole figure
 *    just flattens rather than being cropped or re-lofted. Smooth curves take
 *    that squash without artefacts — a tick field would not have.
 *
 *  Geometry is baked rather than computed at runtime: ~7kB of path data
 *  produced once from the generator, so there's no maths on the client and
 *  every visitor sees the same figure.
 */
export function FooterTrail() {
  return (
    <div aria-hidden="true" className="footer-trail">
      <style>{`
        .footer-trail {
          position: absolute;
          inset-inline: 0;
          bottom: 0;
          height: 130px;
          overflow: hidden;
          pointer-events: none;
          /* Fades the ends and the top so the figure has no cut edges and
             dissolves into the page rather than stopping at a boundary. */
          -webkit-mask-image:
            linear-gradient(to right, transparent 0, #000 7%, #000 93%, transparent 100%),
            linear-gradient(to top, #000 0, #000 74%, transparent 100%);
          mask-image:
            linear-gradient(to right, transparent 0, #000 7%, #000 93%, transparent 100%),
            linear-gradient(to top, #000 0, #000 74%, transparent 100%);
          -webkit-mask-composite: source-in;
          mask-composite: intersect;
        }
        @media (min-width: 768px) {
          .footer-trail { height: 200px; }
        }
        .footer-trail-art {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
        }
        .footer-trail-art path {
          fill: none;
          stroke-width: 1;
          /* Without this the non-uniform stretch would thin the strokes out
             vertically and they'd disappear on short viewports. */
          vector-effect: non-scaling-stroke;
        }
        /* Brand brown into tan on cream; amber into tan on the dark page, where
           the whole group is pulled back — light strands on a dark ground read
           considerably louder than the same alpha does on cream. */
        .footer-trail-art .s1 { stop-color: #5a4128; }
        .footer-trail-art .s2 { stop-color: #ad9479; }
        :is(.dark) .footer-trail-art .s1 { stop-color: #eec584; }
        :is(.dark) .footer-trail-art .s2 { stop-color: #ad9479; }
        :is(.dark) .footer-trail-art { opacity: 0.8; }
      `}</style>
      <svg
        className="footer-trail-art"
        preserveAspectRatio="none"
        viewBox="0 0 1200 200"
      >
        <defs>
          <linearGradient
            gradientUnits="userSpaceOnUse"
            id="footerTrailStroke"
            x1="0"
            x2="1200"
          >
            <stop className="s1" offset="0" />
            <stop className="s2" offset="0.46" />
            <stop className="s1" offset="1" />
          </linearGradient>
        </defs>
        <g stroke="url(#footerTrailStroke)">
          <path
            d="M0 138Q100 140 150 139Q200 138 250 135Q300 132 350 128Q400 123 450 116Q500 109 550 99Q600 88 650 78Q700 67 750 57Q800 46 850 37Q900 27 950 19Q1000 10 1050 4Q1100 -3 1150 -7L1200 -12"
            opacity="0.090"
          />
          <path
            d="M0 141Q100 143 150 142Q200 140 250 137Q300 133 350 129Q400 124 450 117Q500 109 550 99Q600 89 650 79Q700 68 750 58Q800 48 850 39Q900 30 950 22Q1000 14 1050 8Q1100 2 1150 -2L1200 -7"
            opacity="0.195"
          />
          <path
            d="M0 144Q100 145 150 144Q200 142 250 138Q300 134 350 129Q400 124 450 117Q500 110 550 100Q600 90 650 80Q700 70 750 60Q800 50 850 42Q900 33 950 26Q1000 18 1050 12Q1100 6 1150 3L1200 -1"
            opacity="0.248"
          />
          <path
            d="M0 147Q100 148 150 146Q200 144 250 140Q300 136 350 131Q400 125 450 118Q500 110 550 101Q600 91 650 81Q700 71 750 62Q800 52 850 44Q900 36 950 29Q1000 21 1050 16Q1100 11 1150 8L1200 4"
            opacity="0.289"
          />
          <path
            d="M0 150Q100 150 150 148Q200 145 250 141Q300 137 350 131Q400 125 450 118Q500 110 550 101Q600 92 650 83Q700 73 750 64Q800 55 850 47Q900 38 950 32Q1000 25 1050 20Q1100 15 1150 13L1200 10"
            opacity="0.321"
          />
          <path
            d="M0 154Q100 153 150 150Q200 147 250 143Q300 138 350 132Q400 126 450 119Q500 111 550 102Q600 92 650 83Q700 74 750 66Q800 57 850 49Q900 41 950 35Q1000 29 1050 25Q1100 20 1150 18L1200 15"
            opacity="0.348"
          />
          <path
            d="M0 157Q100 155 150 152Q200 149 250 144Q300 139 350 133Q400 126 450 119Q500 111 550 102Q600 93 650 84Q700 75 750 67Q800 59 850 52Q900 44 950 39Q1000 33 1050 29Q1100 24 1150 23L1200 21"
            opacity="0.369"
          />
          <path
            d="M0 160Q100 157 150 154Q200 150 250 145Q300 140 350 134Q400 127 450 119Q500 111 550 103Q600 94 650 86Q700 77 750 69Q800 61 850 54Q900 47 950 42Q1000 36 1050 33Q1100 29 1150 28L1200 26"
            opacity="0.384"
          />
          <path
            d="M0 163Q100 160 150 156Q200 152 250 147Q300 141 350 134Q400 127 450 120Q500 112 550 104Q600 95 650 87Q700 78 750 71Q800 63 850 57Q900 50 950 45Q1000 40 1050 37Q1100 34 1150 33L1200 32"
            opacity="0.394"
          />
          <path
            d="M0 166Q100 162 150 158Q200 154 250 148Q300 142 350 135Q400 128 450 120Q500 112 550 104Q600 96 650 88Q700 80 750 73Q800 65 850 59Q900 53 950 49Q1000 44 1050 41Q1100 38 1150 38L1200 37"
            opacity="0.399"
          />
          <path
            d="M0 170Q100 165 150 160Q200 155 250 149Q300 143 350 136Q400 128 450 120Q500 112 550 104Q600 96 650 89Q700 81 750 74Q800 67 850 62Q900 56 950 52Q1000 47 1050 45Q1100 43 1150 43L1200 43"
            opacity="0.399"
          />
          <path
            d="M0 173Q100 167 150 162Q200 157 250 151Q300 144 350 137Q400 129 450 121Q500 113 550 105Q600 97 650 90Q700 83 750 76Q800 69 850 64Q900 59 950 55Q1000 51 1050 49Q1100 47 1150 48L1200 48"
            opacity="0.394"
          />
          <path
            d="M0 176Q100 169 150 164Q200 159 250 152Q300 145 350 137Q400 129 450 121Q500 113 550 106Q600 98 650 91Q700 84 750 78Q800 72 850 67Q900 62 950 59Q1000 55 1050 54Q1100 52 1150 53L1200 54"
            opacity="0.384"
          />
          <path
            d="M0 179Q100 172 150 166Q200 160 250 153Q300 146 350 138Q400 130 450 122Q500 113 550 106Q600 99 650 92Q700 85 750 80Q800 74 850 69Q900 64 950 61Q1000 58 1050 57Q1100 56 1150 58L1200 59"
            opacity="0.369"
          />
          <path
            d="M0 182Q100 174 150 168Q200 162 250 155Q300 147 350 139Q400 130 450 122Q500 114 550 107Q600 100 650 94Q700 87 750 82Q800 76 850 72Q900 67 950 65Q1000 62 1050 62Q1100 61 1150 63L1200 65"
            opacity="0.348"
          />
          <path
            d="M0 186Q100 177 150 171Q200 164 250 156Q300 148 350 140Q400 131 450 123Q500 114 550 107Q600 100 650 94Q700 88 750 83Q800 78 850 74Q900 70 950 68Q1000 66 1050 66Q1100 66 1150 68L1200 70"
            opacity="0.321"
          />
          <path
            d="M0 189Q100 179 150 173Q200 166 250 158Q300 149 350 140Q400 131 450 123Q500 114 550 108Q600 101 650 96Q700 90 750 85Q800 80 850 77Q900 73 950 72Q1000 70 1050 70Q1100 70 1150 73L1200 76"
            opacity="0.289"
          />
          <path
            d="M0 192Q100 182 150 175Q200 167 250 159Q300 150 350 141Q400 132 450 124Q500 115 550 109Q600 102 650 97Q700 91 750 87Q800 82 850 79Q900 76 950 75Q1000 73 1050 74Q1100 75 1150 78L1200 81"
            opacity="0.248"
          />
          <path
            d="M0 195Q100 184 150 177Q200 169 250 160Q300 151 350 142Q400 132 450 124Q500 115 550 109Q600 103 650 98Q700 93 750 89Q800 84 850 82Q900 79 950 78Q1000 77 1050 78Q1100 79 1150 83L1200 87"
            opacity="0.195"
          />
          <path
            d="M0 198Q100 186 150 179Q200 171 250 162Q300 152 350 143Q400 133 450 124Q500 115 550 110Q600 104 650 99Q700 94 750 90Q800 86 850 84Q900 82 950 82Q1000 81 1050 83Q1100 84 1150 88L1200 92"
            opacity="0.090"
          />
          <path
            d="M0 32Q100 42 150 49Q200 56 250 64Q300 72 350 81Q400 90 450 99Q500 108 550 117Q600 125 650 131Q700 137 750 143Q800 148 850 152Q900 155 950 157Q1000 159 1050 159Q1100 159 1150 156L1200 153"
            opacity="0.070"
          />
          <path
            d="M0 37Q100 46 150 52Q200 58 250 66Q300 74 350 83Q400 91 450 100Q500 109 550 117Q600 125 650 132Q700 138 750 144Q800 149 850 154Q900 158 950 160Q1000 162 1050 163Q1100 163 1150 161L1200 158"
            opacity="0.172"
          />
          <path
            d="M0 41Q100 49 150 55Q200 61 250 69Q300 76 350 84Q400 92 450 101Q500 109 550 117Q600 125 650 132Q700 139 750 145Q800 151 850 156Q900 160 950 163Q1000 165 1050 166Q1100 167 1150 165L1200 163"
            opacity="0.222"
          />
          <path
            d="M0 45Q100 52 150 58Q200 63 250 70Q300 77 350 85Q400 93 450 102Q500 110 550 118Q600 126 650 133Q700 140 750 146Q800 152 850 157Q900 162 950 165Q1000 168 1050 170Q1100 171 1150 170L1200 169"
            opacity="0.257"
          />
          <path
            d="M0 49Q100 55 150 61Q200 66 250 73Q300 79 350 87Q400 94 450 102Q500 110 550 118Q600 126 650 134Q700 141 750 148Q800 154 850 159Q900 164 950 168Q1000 171 1050 173Q1100 175 1150 175L1200 174"
            opacity="0.281"
          />
          <path
            d="M0 54Q100 59 150 64Q200 68 250 74Q300 80 350 88Q400 95 450 103Q500 111 550 119Q600 127 650 135Q700 142 750 149Q800 155 850 161Q900 166 950 171Q1000 175 1050 177Q1100 179 1150 179L1200 179"
            opacity="0.295"
          />
          <path
            d="M0 58Q100 62 150 66Q200 70 250 76Q300 82 350 89Q400 96 450 104Q500 111 550 119Q600 127 650 135Q700 142 750 150Q800 157 850 163Q900 169 950 174Q1000 178 1050 181Q1100 183 1150 184L1200 184"
            opacity="0.300"
          />
          <path
            d="M0 62Q100 65 150 69Q200 73 250 79Q300 84 350 91Q400 97 450 105Q500 112 550 120Q600 127 650 135Q700 143 750 151Q800 158 850 165Q900 171 950 176Q1000 181 1050 184Q1100 187 1150 188L1200 189"
            opacity="0.295"
          />
          <path
            d="M0 67Q100 69 150 72Q200 75 250 80Q300 85 350 92Q400 98 450 105Q500 112 550 120Q600 128 650 136Q700 144 750 152Q800 159 850 166Q900 173 950 179Q1000 184 1050 188Q1100 191 1150 193L1200 194"
            opacity="0.281"
          />
          <path
            d="M0 71Q100 72 150 75Q200 77 250 82Q300 87 350 93Q400 99 450 106Q500 113 550 121Q600 128 650 137Q700 145 750 153Q800 161 850 168Q900 175 950 181Q1000 187 1050 191Q1100 195 1150 198L1200 200"
            opacity="0.257"
          />
          <path
            d="M0 75Q100 75 150 78Q200 80 250 84Q300 88 350 94Q400 100 450 107Q500 113 550 121Q600 129 650 138Q700 146 750 154Q800 162 850 170Q900 177 950 184Q1000 190 1050 195Q1100 199 1150 202L1200 205"
            opacity="0.222"
          />
          <path
            d="M0 79Q100 78 150 80Q200 82 250 86Q300 90 350 96Q400 101 450 108Q500 114 550 122Q600 129 650 138Q700 147 750 156Q800 164 850 172Q900 180 950 187Q1000 193 1050 198Q1100 203 1150 207L1200 210"
            opacity="0.172"
          />
          <path
            d="M0 84Q100 82 150 84Q200 85 250 88Q300 91 350 96Q400 101 450 108Q500 114 550 122Q600 129 650 138Q700 147 750 156Q800 165 850 174Q900 182 950 189Q1000 196 1050 202Q1100 208 1150 212L1200 215"
            opacity="0.070"
          />
        </g>
      </svg>
    </div>
  );
}
