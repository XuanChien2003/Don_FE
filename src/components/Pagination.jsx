export function Pagination({ page = 1, limit = 20, total = 0, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Build page numbers array with optional ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (page <= 3) {
      return [1, 2, 3, '...', totalPages];
    }
    if (page >= totalPages - 2) {
      return [1, '...', totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', page, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div className="vtp-pagination">
      <button
        type="button"
        className="vtp-page-btn"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        title="Trang trước"
      >
        ‹
      </button>

      {pages.map((p, idx) => (
        typeof p === 'number' ? (
          <button
            // eslint-disable-next-line react/no-array-index-key
            key={idx}
            type="button"
            className={`vtp-page-btn ${p === page ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ) : (
          // eslint-disable-next-line react/no-array-index-key
          <span key={idx} className="vtp-page-ellipsis">
            {p}
          </span>
        )
      ))}

      <button
        type="button"
        className="vtp-page-btn"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        title="Trang sau"
      >
        ›
      </button>
    </div>
  );
}
