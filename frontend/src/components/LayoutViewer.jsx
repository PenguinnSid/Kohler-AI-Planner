export default function LayoutViewer({ layoutSvg }) {
  if (!layoutSvg) return null;

  return (
    <div>
      <h3>Room layout</h3>
      <div dangerouslySetInnerHTML={{ __html: layoutSvg }} />
    </div>
  );
}
