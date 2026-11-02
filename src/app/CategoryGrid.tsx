"use client";

type CategoryItem = {
  name: string;
  img: string;
  fallback: string;
};

export default function CategoryGrid({ categories }: { categories: CategoryItem[] }) {
  return (
    <div className="grid">
      {categories.map((c, i) => (
        <a className={`tile reveal reveal-delay-${(i % 4) + 1}`} href="#products" key={c.name}>
          <div className="tile-img-box">
            <img
              src={c.img}
              alt={c.name}
              className="tile-img"
            />
          </div>
          <b>{c.name}</b>
          <small>Xem danh mục →</small>
        </a>
      ))}
    </div>
  );
}

