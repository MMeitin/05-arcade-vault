import Link from "next/link";
import type { Game, ScoreRow } from "@/lib/types";

const fmt = (n: number) => n.toLocaleString("es-ES");

function PodiumSlot({
  row,
  place,
  className,
  champion,
}: {
  row?: ScoreRow;
  place: string;
  className: string;
  champion?: boolean;
}) {
  return (
    <div className={"podium-slot " + className}>
      {champion && (
        <div
          className="pixel"
          style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
        >
          CAMPEÓN
        </div>
      )}
      <div
        className="rank-num"
        style={champion ? { fontSize: 36, marginTop: 4 } : undefined}
      >
        {place}
      </div>
      <div className="name">{row ? row.name : "—"}</div>
      <div className="score" style={champion ? { fontSize: 20 } : undefined}>
        {row ? fmt(row.score) : "—"}
      </div>
      <div className="date">{row ? row.date : " "}</div>
    </div>
  );
}

export function HallOfFame({
  games,
  active,
  rows,
}: {
  games: Game[];
  active: Game;
  rows: ScoreRow[];
}) {
  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <nav className="hall-tabs" aria-label="Juegos">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/salon?juego=${g.id}`}
            className={"chip" + (active.id === g.id ? " active" : "")}
            aria-current={active.id === g.id ? "page" : undefined}
            scroll={false}
          >
            {g.title}
          </Link>
        ))}
      </nav>

      <div className="podium">
        <PodiumSlot row={rows[1]} place="02" className="silver" />
        <PodiumSlot row={rows[0]} place="01" className="gold" champion />
        <PodiumSlot row={rows[2]} place="03" className="bronze" />
      </div>

      <div className="hall-table">
        <div className="th">
          <div>RANGO</div>
          <div>JUGADOR</div>
          <div>PUNTUACIÓN</div>
          <div>FECHA</div>
        </div>
        {rows.length === 0 ? (
          <div className="hall-empty">
            <div className="pixel">SIN PUNTUACIONES AÚN</div>
            <p>Nadie ha puntuado en {active.title}. Sé el primero.</p>
            <Link href={`/juegos/${active.id}/jugar`} className="btn yellow">
              JUGAR {active.title}
            </Link>
          </div>
        ) : (
          rows.map((r, i) => (
            <div
              key={r.rank}
              className={
                "tr" +
                (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")
              }
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
              <div className="pl">{r.name}</div>
              <div className="sc">{fmt(r.score)}</div>
              <div className="dt">{r.date}</div>
            </div>
          ))
        )}
      </div>

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/biblioteca" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
