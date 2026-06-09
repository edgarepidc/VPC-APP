export default function RoiMeetingsPage() {
  return (
    <main className="flex min-h-[min(80vh,900px)] flex-col">
      <iframe
        title="ROI de Reuniones"
        src="/roi-meetings.html"
        className="min-h-[820px] w-full flex-1 rounded-lg border border-slate-200 bg-slate-50"
        sandbox="allow-scripts allow-same-origin"
      />
    </main>
  );
}
