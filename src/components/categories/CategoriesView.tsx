import React, { useState } from 'react';
import { useStore } from '../../store/storeContext';
import { Category } from '../../domain/types';
import { Modal } from '../common/Modal';

const PALETTE = [
  '#0969da', // GitHub Blue
  '#1a7f37', // GitHub Forest Green
  '#d29922', // GitHub Amber / Chai
  '#bf3989', // GitHub Plum
  '#58a6ff', // GitHub Sky Blue
  '#8250df', // GitHub Purple
  '#2da44e', // GitHub Mint Green
  '#cf222e', // GitHub Red
  '#0550ae', // GitHub Deep Navy
  '#fb8f44', // GitHub Orange
  '#1b7c83', // GitHub Teal
  '#6e7781', // GitHub Neutral Slate
];

export const CategoriesView: React.FC = () => {
  const { categories, addCategory, updateCategory, softDeleteCategory, showToast } = useStore();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);

  // New Category State
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PALETTE[0]!);

  // Edit Category State
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editArchived, setEditArchived] = useState(false);

  const activeCategories = categories.filter((c) => !c.deleted && !c.archived);
  const archivedCategories = categories.filter((c) => !c.deleted && c.archived);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    await addCategory(newName.trim(), newColor);
    setNewName('');
    setIsAddOpen(false);
    showToast({ message: `Category "${newName.trim()}" created` });
  };

  const openEdit = (cat: Category) => {
    setEditingCat(cat);
    setEditName(cat.name);
    setEditColor(cat.color);
    setEditArchived(cat.archived);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCat || !editName.trim()) return;

    await updateCategory(editingCat.id, {
      name: editName.trim(),
      color: editColor,
      archived: editArchived,
    });
    setEditingCat(null);
    showToast({ message: `Updated category "${editName.trim()}"` });
  };

  const handleDelete = async (id: string, name: string) => {
    await softDeleteCategory(id);
    setEditingCat(null);
    showToast({ message: `Category "${name}" deleted` });
  };

  return (
    <div className="categories-view">
      <div className="section-header-row card">
        <div>
          <h2>Categories</h2>
          <p className="text-muted">Manage tags, colors, and archived statuses for classification.</p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsAddOpen(true)}
        >
          + New Category
        </button>
      </div>

      {/* Active Categories */}
      <div className="category-section card">
        <h3 className="section-subtitle">Active Categories ({activeCategories.length})</h3>
        <div className="categories-grid">
          {activeCategories.map((cat) => (
            <div
              key={cat.id}
              className="category-item-card"
              onClick={() => openEdit(cat)}
              role="button"
              tabIndex={0}
            >
              <span className="cat-color-badge" style={{ backgroundColor: cat.color }} />
              <span className="cat-name">{cat.name}</span>
              <button
                type="button"
                className="btn-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  openEdit(cat);
                }}
              >
                ✏️
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Archived Categories */}
      {archivedCategories.length > 0 && (
        <div className="category-section card">
          <h3 className="section-subtitle">Archived Categories ({archivedCategories.length})</h3>
          <p className="text-muted small-text">Archived categories are hidden from quick-add options.</p>
          <div className="categories-grid">
            {archivedCategories.map((cat) => (
              <div
                key={cat.id}
                className="category-item-card archived"
                onClick={() => openEdit(cat)}
                role="button"
                tabIndex={0}
              >
                <span className="cat-color-badge" style={{ backgroundColor: cat.color, opacity: 0.5 }} />
                <span className="cat-name text-muted">{cat.name}</span>
                <span className="archived-tag">Archived</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add Category">
        <form onSubmit={handleCreate} className="quick-add-form">
          <div className="form-section">
            <label className="form-label">Category Name</label>
            <input
              type="text"
              className="text-input"
              placeholder="e.g. Books & Learning"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-section">
            <label className="form-label">Color Theme</label>
            <div className="color-palette-grid">
              {PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`color-swatch ${newColor === c ? 'selected-swatch' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Category
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editingCat} onClose={() => setEditingCat(null)} title="Edit Category">
        <form onSubmit={handleUpdate} className="quick-add-form">
          <div className="form-section">
            <label className="form-label">Category Name</label>
            <input
              type="text"
              className="text-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
          </div>

          <div className="form-section">
            <label className="form-label">Color Theme</label>
            <div className="color-palette-grid">
              {PALETTE.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`color-swatch ${editColor === c ? 'selected-swatch' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setEditColor(c)}
                />
              ))}
            </div>
          </div>

          <div className="form-section checkbox-row">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={editArchived}
                onChange={(e) => setEditArchived(e.target.checked)}
              />
              <span>Archive this category (hides from Quick Add)</span>
            </label>
          </div>

          <div className="form-actions space-between">
            {editingCat && (
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => handleDelete(editingCat.id, editingCat.name)}
              >
                Delete
              </button>
            )}
            <div className="button-group">
              <button type="button" className="btn btn-secondary" onClick={() => setEditingCat(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
