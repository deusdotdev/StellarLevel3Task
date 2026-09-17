import { shortAddr } from '@/lib/format'
import { useDesk } from '@/lib/desk-context'

export function TapePage() {
  const { events } = useDesk()
  return (
    <section className="rounded-2xl border border-line bg-glass p-4">
      <h1 className="mb-3 text-2xl font-semibold text-white">Tape</h1>
      <p className="mb-4 text-sm text-mute">Recent desk, oracle, and token events.</p>
      {events.length === 0 ? (
        <p className="text-sm text-mute">No recent contract events yet.</p>
      ) : (
        <ul className="space-y-2 font-mono text-xs">
          {events.map((ev) => (
            <li key={ev.id} className="rounded-lg border border-line bg-black/35 p-3">
              <div className="text-accent">{ev.type}</div>
              <div className="mt-1 break-all text-mute">{ev.value}</div>
              <div className="mt-1 text-[#6b7280]">
                ledger {ev.ledger}
                {ev.id ? ` · ${shortAddr(ev.id)}` : ''}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
