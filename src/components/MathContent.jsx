import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

function MathContent({ content, inline = false, className = '' }) {
  const Root = inline ? 'span' : 'div'

  return (
    <Root className={`math-content${inline ? ' is-inline' : ''}${className ? ` ${className}` : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[[rehypeKatex, { throwOnError: false, trust: false }]]}
        components={inline ? { p: 'span' } : undefined}
      >
        {typeof content === 'string' ? content : ''}
      </ReactMarkdown>
    </Root>
  )
}

export default MathContent
