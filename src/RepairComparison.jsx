import { useId, useRef, useState } from "react";

// توليد شروخ ثابتة، لا تتغير أثناء سحب الخط.
function makeShatter(cx, cy, radius, rays, seed) {
  let state = seed >>> 0;

  const random = () => {
    state =
      (Math.imul(state, 1664525) + 1013904223) >>> 0;

    return state / 4294967296;
  };

  const point = (angle, distance) => [
    cx + Math.cos(angle) * distance,
    cy + Math.sin(angle) * distance
  ];

  const xy = p =>
    `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;

  const angles = Array.from(
    { length: rays },
    (_, i) =>
      (i / rays) * Math.PI * 2 +
      (random() - 0.5) * 0.12
  );

  const distances = [
    0.025,
    0.06,
    0.12,
    0.21,
    0.34,
    0.53,
    0.76,
    1
  ];

  const grid = distances.map(distance =>
    angles.map(angle =>
      point(
        angle + (random() - 0.5) * 0.13,
        radius *
          distance *
          (0.8 + random() * 0.4)
      )
    )
  );

  let spokes = "";
  let rings = "";

  for (let i = 0; i < rays; i++) {
    spokes +=
      `M${cx} ${cy} ` +
      grid
        .map(row => `L${xy(row[i])}`)
        .join(" ");
  }

  grid.forEach((row, level) => {
    row.forEach((p, i) => {
      if (level < 4 || random() > 0.35) {
        rings +=
          `M${xy(p)} ` +
          `L${xy(row[(i + 1) % rays])} `;
      }

      if (level > 1 && random() > 0.6) {
        const end = point(
          angles[i] + 0.22,
          radius * distances[level] * 1.3
        );

        rings += `M${xy(p)} L${xy(end)} `;
      }
    });
  });

  const chips = Array.from(
    { length: 22 },
    () => {
      const angle = random() * Math.PI * 2;

      const distance =
        radius * (0.015 + random() * 0.11);

      return (
        `M${xy(point(angle, distance))} ` +
        `L${xy(
          point(angle + 0.13, distance * 1.4)
        )} ` +
        `L${xy(
          point(angle - 0.16, distance * 1.6)
        )} Z`
      );
    }
  ).join(" ");

  return { spokes, rings, chips };
}

// ثلاثة مراكز كسر في الشاشة.
const screenDamage = [
  makeShatter(840, 480, 840, 30, 31),
  makeShatter(1010, 995, 430, 23, 62),
  makeShatter(715, 170, 260, 19, 93)
];

// ثلاثة مراكز كسر في الضهر.
const backDamage = [
  makeShatter(380, 710, 660, 30, 124),
  makeShatter(510, 1055, 380, 23, 155),
  makeShatter(305, 450, 260, 20, 186)
];

// الكسور الخاصة بكل عدسة.
const lenses = [
  {
    x: 368,
    y: 130,
    r: 57,
    damage: makeShatter(
      352, 139, 115, 22, 217
    )
  },
  {
    x: 480,
    y: 235,
    r: 54,
    damage: makeShatter(
      484, 226, 110, 23, 248
    )
  },
  {
    x: 363,
    y: 295,
    r: 57,
    damage: makeShatter(
      351, 303, 115, 22, 279
    )
  }
];

const cameraHousing = makeShatter(
  448, 357, 280, 22, 310
);

function Shatter({
  pattern,
  dark = false,
  lens = false
}) {
  return (
    <g
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d={pattern.spokes}
        stroke={dark ? "#454b53" : "#030814"}
        strokeWidth={lens ? 2.6 : 3.4}
        opacity="0.8"
      />

      <path
        d={pattern.spokes}
        stroke={dark ? "#f7f8fa" : "#eef7ff"}
        strokeWidth={lens ? 1.1 : 1.6}
        opacity="0.95"
      />

      <path
        d={pattern.rings}
        stroke={dark ? "#737b85" : "#dbeeff"}
        strokeWidth={lens ? 0.85 : 1.05}
        opacity={dark ? 0.85 : 0.75}
      />

      <path
        d={pattern.chips}
        fill={dark ? "#66717e" : "#e6f4ff"}
        stroke="none"
        opacity="0.35"
      />
    </g>
  );
}

const styles = `
.ifix-compare {
  width: 100%;
  max-width: 530px;
  margin: auto;
  font-family: inherit;
  color: #171719;
  min-width: 0;
}

.ifix-compare * {
  box-sizing: border-box;
}

.ifix-compare-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.ifix-compare-title {
  font-size: 12px;
  font-weight: 800;
  color: #62626d;
}

.ifix-compare-demo {
  font-size: 10px;
  color: #8b8b96;
  border: 1px solid #dedee5;
  border-radius: 99px;
  padding: 4px 9px;
}

.ifix-compare-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 1263 / 1245;
  overflow: hidden;

  border-radius: 24px;

  background: radial-gradient(
    ellipse at 50% 40%,
    #ffffff,
    #e8e8ee
  );

  border: 1px solid white;
  isolation: isolate;

  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;

  cursor: ew-resize;
  outline: none;
  direction: ltr;

  box-shadow: 0 14px 40px #17171908;
}

.ifix-compare-stage:focus-visible {
  outline: 3px solid #77778a;
  outline-offset: 4px;
}

.ifix-compare-art {
  position: absolute;
  inset: 7%;
  width: 86%;
  height: 86%;
  pointer-events: none;
}

.ifix-compare-before {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.ifix-compare-line {
  position: absolute;
  top: 0;
  bottom: 0;

  width: 2px;
  background: white;

  transform: translateX(-50%);

  box-shadow:
    0 0 0 1px #15151914,
    0 0 12px #00000020;

  pointer-events: none;
  z-index: 3;
}

.ifix-compare-knob {
  position: absolute;
  left: 50%;
  top: 50%;

  transform: translate(-50%, -50%);

  width: 48px;
  height: 48px;

  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;

  border-radius: 50%;
  background: white;
  color: #171719;

  box-shadow: 0 3px 18px #00000025;
  border: 1px solid #ededf1;

  font-family: Arial, sans-serif;
  font-size: 19px;
  font-weight: 800;
}

.ifix-compare-tag {
  position: absolute;
  top: 14px;

  padding: 6px 11px;
  border-radius: 9px;

  background: #ffffffdc;
  border: 1px solid white;

  font-size: 10px;
  font-weight: 800;

  z-index: 2;
  pointer-events: none;
  color: #555562;
}

.ifix-compare-tag.before {
  left: 14px;
}

.ifix-compare-tag.after {
  right: 14px;
}

.ifix-compare-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  margin-top: 14px;
  flex-wrap: wrap;
}

.ifix-compare-controls button {
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  line-height: 1.5;

  padding: 9px 14px;
  min-height: 38px;

  border: 1px solid #dcdce3;
  border-radius: 10px;

  background: white;
  color: #454551;
  cursor: pointer;
}

.ifix-compare-controls button.active {
  background: #171719;
  color: white;
  border-color: #171719;
}

.ifix-compare-controls button:hover {
  border-color: #666666;
}

.ifix-compare-hint {
  text-align: center;
  color: #7e7e89;
  font-size: 11px;
  line-height: 1.8;
  margin: 11px 0 0;
}

.ifix-compare-error {
  position: absolute;
  inset: 15%;

  display: grid;
  place-items: center;

  text-align: center;
  font-size: 13px;
  color: #676773;

  background: #f6f6f8;
  z-index: 4;

  padding: 20px;
  border-radius: 16px;
}

@media (max-width: 700px) {
  .ifix-compare {
    max-width: 390px;
  }

  .ifix-compare-stage {
    border-radius: 20px;
  }

  .ifix-compare-knob {
    width: 44px;
    height: 44px;
  }

  .ifix-compare-title {
    font-size: 11px;
  }
}
`;

function PhoneArtwork({
  damaged = false,
  prefix,
  onError
}) {
  return (
    <svg
      className="ifix-compare-art"
      viewBox="0 0 1263 1245"
      aria-hidden="true"
    >
      <defs>
        {/* حدود شاشة الموبايل */}
        <clipPath id={`${prefix}-screen`}>
          <path
            d="
              M728 50
              C680 40 653 77 653 140
              L653 1122
              Q653 1209 725 1209
              L1008 1209
              Q1074 1209 1074 1141
              L1074 203
              Q1074 123 1011 106
              Z
            "
          />
        </clipPath>

        {/* حدود الضهر */}
        <clipPath id={`${prefix}-back`}>
          <path
            d="
              M245 413
              L590 413
              L590 1221
              L319 1221
              Q244 1221 245 1143
              Z
            "
          />
        </clipPath>

        {/* منطقة الكاميرات */}
        <clipPath id={`${prefix}-housing`}>
          <path
            d="
              M303 48
              Q278 42 272 82
              L265 322
              Q267 370 316 388
              L490 407
              Q548 412 550 353
              L554 142
              Q552 95 503 82
              Z
            "
          />
        </clipPath>

        {/* حدود كل عدسة */}
        {lenses.map((lens, index) => (
          <clipPath
            key={index}
            id={`${prefix}-lens-${index}`}
          >
            <ellipse
              cx={lens.x}
              cy={lens.y}
              rx={lens.r}
              ry={lens.r * 1.12}
            />
          </clipPath>
        ))}
      </defs>

      {/* الصورة الأصلية السليمة */}
      <image
        href="/IMG_5564.PNG"
        width="1263"
        height="1245"
        onError={onError}
      />

      {damaged && (
        <>
          {/* تلف الشاشة */}
          <g clipPath={`url(#${prefix}-screen)`}>
            <rect
              x="650"
              y="40"
              width="430"
              height="1180"
              fill="#030713"
              opacity="0.43"
            />

            {/* أجزاء سوداء عند أطراف الشاشة */}
            <path
              d="
                M652 820
                L690 848
                L681 930
                L716 992
                L705 1085
                L750 1215
                L650 1215
                Z
              "
              fill="#02040a"
              opacity="0.9"
            />

            <path
              d="
                M1078 109
                L1034 170
                L1048 227
                L1028 291
                L1078 350
                Z
              "
              fill="#02040a"
              opacity="0.9"
            />

            <path
              d="
                M1017 1002
                L1040 1060
                L1078 1095
                L1078 1215
                L1002 1215
                L1025 1130
                Z
              "
              fill="#02040a"
              opacity="0.75"
            />

            {screenDamage.map((pattern, index) => (
              <Shatter
                key={index}
                pattern={pattern}
              />
            ))}

            <path
              d="M1051 191 L1051 1195"
              stroke="#b7f9dd"
              strokeWidth="1.5"
              opacity="0.6"
            />
          </g>

          {/* تلف الضهر */}
          <g clipPath={`url(#${prefix}-back)`}>
            <path
              d="
                M245 428
                L270 461
                L254 500
                L283 556
                L245 610
                Z

                M590 1060
                L565 1105
                L578 1140
                L550 1224
                L590 1224
                Z
              "
              fill="#5f6975"
              opacity="0.4"
            />

            {backDamage.map((pattern, index) => (
              <Shatter
                key={index}
                pattern={pattern}
                dark
              />
            ))}
          </g>

          {/* كسور المنطقة المحيطة بالكاميرات */}
          <g clipPath={`url(#${prefix}-housing)`}>
            <Shatter
              pattern={cameraHousing}
              dark
            />
          </g>

          {/* كسور زجاج العدسات الثلاثة */}
          {lenses.map((lens, index) => (
            <g
              key={index}
              clipPath={`url(#${prefix}-lens-${index})`}
            >
              <ellipse
                cx={lens.x}
                cy={lens.y}
                rx={lens.r}
                ry={lens.r * 1.12}
                fill="#c3d2de"
                opacity="0.12"
              />

              <Shatter
                pattern={lens.damage}
                lens
              />
            </g>
          ))}
        </>
      )}
    </svg>
  );
}

export default function RepairComparison({
  isArabic = true
}) {
  const [position, setPosition] = useState(65);
  const [imageError, setImageError] = useState(false);

  const stage = useRef(null);
  const pointer = useRef(null);

  const prefix = useId().replace(/:/g, "");

  const clamp = value =>
    Math.max(0, Math.min(100, value));

  function updateFromPointer(event) {
    const box = stage.current.getBoundingClientRect();

    if (box.width) {
      const nextPosition =
        ((event.clientX - box.left) / box.width) * 100;

      setPosition(clamp(nextPosition));
    }
  }

  function startDrag(event) {
    if (
      !event.isPrimary ||
      event.button !== 0 ||
      pointer.current !== null
    ) {
      return;
    }

    pointer.current = event.pointerId;

    event.currentTarget.focus({
      preventScroll: true
    });

    event.currentTarget.setPointerCapture(
      event.pointerId
    );

    updateFromPointer(event);
  }

  function finishDrag(event) {
    if (pointer.current !== event.pointerId) {
      return;
    }

    pointer.current = null;

    if (
      event.currentTarget.hasPointerCapture(
        event.pointerId
      )
    ) {
      event.currentTarget.releasePointerCapture(
        event.pointerId
      );
    }
  }

  function handleKey(event) {
    const change = event.shiftKey ? 10 : 2;
    let next;

    if (
      event.key === "ArrowLeft" ||
      event.key === "ArrowDown"
    ) {
      next = position - change;
    } else if (
      event.key === "ArrowRight" ||
      event.key === "ArrowUp"
    ) {
      next = position + change;
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = 100;
    } else {
      return;
    }

    event.preventDefault();
    setPosition(clamp(next));
  }

  return (
    <div
      className="ifix-compare"
      dir={isArabic ? "rtl" : "ltr"}
    >
      <style>{styles}</style>

      <div className="ifix-compare-head">
        <span className="ifix-compare-title">
          {isArabic
            ? "شوف الفرق بنفسك"
            : "See the difference"}
        </span>

        <span className="ifix-compare-demo">
          {isArabic
            ? "محاكاة توضيحية"
            : "Illustrative demo"}
        </span>
      </div>

      <div
        className="ifix-compare-stage"
        ref={stage}
        role="slider"
        tabIndex={0}
        aria-label={
          isArabic
            ? "مقارنة قبل وبعد الإصلاح؛ اسحب للشمال لإظهار الجهاز السليم"
            : "Before and after repair. Drag left to reveal the repaired phone"
        }
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(position)}
        aria-valuetext={
          isArabic
            ? `الجزء المتضرر ${Math.round(position)} بالمئة`
            : `${Math.round(position)} percent damaged view`
        }
        aria-orientation="horizontal"
        aria-describedby={`${prefix}-hint`}
        onPointerDown={startDrag}
        onPointerMove={event => {
          if (
            pointer.current === event.pointerId
          ) {
            updateFromPointer(event);
          }
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={() => {
          pointer.current = null;
        }}
        onKeyDown={handleKey}
      >
        {/* طبقة الموبايل السليم */}
        <PhoneArtwork
          prefix={`${prefix}-after`}
          onError={() => setImageError(true)}
        />

        {/* طبقة الموبايل المتضرر */}
        <div
          className="ifix-compare-before"
          style={{
            clipPath: `inset(0 ${100 - position}% 0 0)`
          }}
        >
          <PhoneArtwork
            damaged
            prefix={`${prefix}-before`}
            onError={() => setImageError(true)}
          />
        </div>

        <span className="ifix-compare-tag before">
          {isArabic ? "قبل الإصلاح" : "Before"}
        </span>

        <span className="ifix-compare-tag after">
          {isArabic ? "بعد الإصلاح" : "After"}
        </span>

        {/* خط المقارنة */}
        <div
          className="ifix-compare-line"
          style={{
            left: `${position}%`
          }}
        >
          <span className="ifix-compare-knob">
            <span>‹</span>
            <span>›</span>
          </span>
        </div>

        {imageError && (
          <div className="ifix-compare-error">
            {isArabic
              ? "تعذّر تحميل صورة الجهاز. تأكد من وجود IMG_5564.PNG داخل public."
              : "Image unavailable. Keep IMG_5564.PNG inside public."}
          </div>
        )}
      </div>

      <div className="ifix-compare-controls">
        <button
          type="button"
          className={position === 100 ? "active" : ""}
          onClick={() => setPosition(100)}
        >
          {isArabic ? "قبل الإصلاح" : "Before"}
        </button>

        <button
          type="button"
          className={position === 50 ? "active" : ""}
          onClick={() => setPosition(50)}
        >
          {isArabic ? "مقارنة" : "Compare"}
        </button>

        <button
          type="button"
          className={position === 0 ? "active" : ""}
          onClick={() => setPosition(0)}
        >
          {isArabic ? "بعد الإصلاح" : "After"}
        </button>
      </div>

      <p
        className="ifix-compare-hint"
        id={`${prefix}-hint`}
      >
        {isArabic
          ? "اسحب الخط الأبيض للشمال بالماوس أو بإصبعك لإظهار الجهاز السليم."
          : "Drag the white line left with your mouse or finger to reveal the repaired phone."}
      </p>
    </div>
  );
}