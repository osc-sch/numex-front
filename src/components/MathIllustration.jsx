function MathIllustration() {
  return (
    <div className="math-illustration" aria-hidden="true">
      <span className="math-formula formula-function">y = 2x + 1</span>
      <span className="math-formula formula-area">πr²</span>
      <span className="math-formula formula-identity">a² + b² = c²</span>
      <svg viewBox="0 0 400 290" fill="none">
        <path d="M38 215H360M128 36V264" stroke="#94a3b8" strokeWidth="1.2" />
        <path d="M351 211L360 215L351 219M124 45L128 36L132 45" stroke="#94a3b8" strokeWidth="1.2" />
        <path d="M48 196C99 192 119 137 168 145S251 246 351 101" stroke="#60a5fa" strokeWidth="4" strokeLinecap="round" />
        <path d="M64 245L322 67" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="7 8" strokeLinecap="round" />
        <circle cx="168" cy="145" r="7" fill="#2563eb" stroke="white" strokeWidth="4" />
        <circle cx="305" cy="184" r="7" fill="#10b981" stroke="white" strokeWidth="4" />
        <circle cx="78" cy="72" r="25" stroke="#fdba74" strokeWidth="4" />
        <path d="M302 39L342 54L328 93L288 78Z" stroke="#5eead4" strokeWidth="4" />
        <path d="M343 227L369 268L322 264Z" fill="#c4b5fd" opacity=".85" />
        <path d="M30 133H47M38.5 124.5V141.5" stroke="#f9a8d4" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export default MathIllustration
