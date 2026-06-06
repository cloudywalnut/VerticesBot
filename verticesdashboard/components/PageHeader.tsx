export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div style={{
      marginBottom: 28,
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
      flexWrap: 'wrap', gap: 12,
    }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: '4px 0 0' }}>{subtitle}</p>
        )}
      </div>
      {children && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>{children}</div>
      )}
    </div>
  );
}
