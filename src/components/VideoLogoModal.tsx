export function VideoLogoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div className="relative w-full max-w-[560px]" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 flex h-8 w-8 items-center justify-center rounded-[6px] text-white/80 transition hover:text-white"
        >
          <i className="ti ti-x text-[20px]" />
        </button>
        <video
          src="/v_tsadoq_2.mp4"
          autoPlay
          controls
          playsInline
          className="w-full rounded-[12px] shadow-2xl"
        />
      </div>
    </div>
  )
}
