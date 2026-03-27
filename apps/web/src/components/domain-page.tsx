import Link from "next/link";

type DomainPageProps = {
  title: string;
  description: string;
  items: Array<{
    id: string;
    title: string;
    body?: string;
    meta?: string;
    href?: string;
  }>;
};

export function DomainPage({ title, description, items }: DomainPageProps) {
  return (
    <div className="panel page-card">
      <h1>{title}</h1>
      <p className="muted">{description}</p>
      {items.length === 0 ? (
        <div className="empty-state">No records returned yet.</div>
      ) : (
        <div className="list">
          {items.map((item) => (
            <div className="list-item" key={item.id}>
              <strong>{item.title}</strong>
              {item.body ? <p className="muted" style={{ marginBottom: 8 }}>{item.body}</p> : null}
              <div className="muted">{item.meta}</div>
              {item.href ? <div style={{ marginTop: 12 }}><Link className="button-secondary" href={item.href}>Open</Link></div> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
