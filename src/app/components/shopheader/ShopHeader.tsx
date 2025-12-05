'use client';

interface ShopHeaderProps {
  sort: string;
  pageSize: number;
  view: 'grid' | 'list';
  category: string;
  onSortChange: (sort: string) => void;
  onPageSizeChange: (size: number) => void;
  onViewChange: (view: 'grid' | 'list') => void;
  onCategoryChange: (category: string) => void;
}

const ShopHeader = ({
  sort,
  pageSize,
  view,
  category,
  onSortChange,
  onPageSizeChange,
  onViewChange,
  onCategoryChange,
}: ShopHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
      {/* Vista grid/list */}
      <div className="flex gap-2">
        <button
          className={`btn btn-sm ${view === 'grid' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          onClick={() => onViewChange('grid')}
        >
          <i className="fa fa-th-large"></i>
        </button>
        <button
          className={`btn btn-sm ${view === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
          onClick={() => onViewChange('list')}
        >
          <i className="fa fa-bars"></i>
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <select
          value={sort}
          onChange={(e) => onSortChange(e.target.value)}
          className="border rounded px-3 py-1 text-sm"
        >
          <option value="latest">Latest</option>
          <option value="popularity">Popularity</option>
          <option value="rating">Best Rating</option>
        </select>

        <select
          value={category}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="border rounded px-3 py-1 text-sm"
        >
          <option value="">All Categories</option>
          <option value="Librería">Librería</option>
          <option value="Electrónica">Electrónica</option>
          <option value="Juguetería">Juguetería</option>
          <option value="Tecnología">Tecnología</option>
          <option value="Hogar">Hogar</option>
          <option value="Ropa">Ropa</option>
          <option value="Jardinería">Jardinería</option>
          <option value="Deportes">Deportes</option>
        </select>

        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="border rounded px-3 py-1 text-sm"
        >
          <option value={8}>8</option>
          <option value={12}>12</option>
          <option value={20}>20</option>
        </select>
      </div>
    </div>
  );
};

export default ShopHeader;
