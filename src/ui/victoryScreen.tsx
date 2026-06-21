export function VictoryScreen({ elapsed }: { elapsed: number }) {
  return (
    <div className="victory-screen absolute inset-0 z-50 flex flex-col items-center justify-center bg-black px-6 text-center text-white">
      <div className="victory-title">血月破晓</div>
      <div className="victory-message space-y-3">
        <div className="victory-clear-text">通关用时 {elapsed.toFixed(1)}s</div>
        <div className="victory-restart-text">按 R 重新开始</div>
      </div>
    </div>
  );
}
