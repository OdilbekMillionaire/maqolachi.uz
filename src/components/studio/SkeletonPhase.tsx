import { motion, Reorder } from "framer-motion";
import { useState } from "react";
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Edit2,
  ArrowRight,
  ArrowLeft,
  Lock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProjectStore, Section } from "@/store/projectStore";
import { cn } from "@/lib/utils";
import { getTranslation, Language } from "@/lib/translations";

export const SkeletonPhase = () => {
  const { currentProject, setPhase, addSection, updateSection, removeSection, reorderSections } = useProjectStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSectionName, setNewSectionName] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  
  const sections = currentProject?.sections || [];
  const lang = (currentProject?.config?.language || 'uz') as Language;
  const t = getTranslation(lang);
  const title = currentProject?.title || t.noTitleSelected;
  
  const handleReorder = (newOrder: Section[]) => {
    const reordered = newOrder.map((section, index) => ({
      ...section,
      order: index,
    }));
    reorderSections(reordered);
  };
  
  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    addSection({
      name: newSectionName,
      notes: "",
      content: "",
      status: "EMPTY",
      summary: "",
      order: sections.length,
    });
    setNewSectionName("");
    setShowAddForm(false);
  };
  
  const handleUpdateName = (id: string, name: string) => {
    updateSection(id, { name });
    setEditingId(null);
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{t.skeletonTitle}</h1>
          <p className="text-muted-foreground">{t.skeletonSubtitle}</p>
        </div>
        
        {/* Title preview */}
        <div className="glass-panel p-6 mb-8">
          <p className="text-xs text-muted-foreground mb-2">{t.selectedTitleLabel}</p>
          <h2 className="text-xl font-serif text-foreground leading-relaxed">
            {title}
          </h2>
        </div>
        
        {/* Sections list */}
        <div className="glass-panel p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold">{t.sectionsLabel}</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              {t.addSection}
            </Button>
          </div>
          
          <Reorder.Group
            axis="y"
            values={sections}
            onReorder={handleReorder}
            className="space-y-3"
          >
            {sections.map((section, index) => (
              <Reorder.Item
                key={section.id}
                value={section}
                className="cursor-move"
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border bg-secondary/30 group",
                    "hover:border-primary/30 hover:bg-secondary/50 transition-all"
                  )}
                >
                  {/* Drag handle */}
                  <div className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                    <GripVertical className="w-5 h-5" />
                  </div>
                  
                  {/* Order number */}
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-primary">{index + 1}</span>
                  </div>
                  
                  {/* Section name */}
                  <div className="flex-1 min-w-0">
                    {editingId === section.id ? (
                      <input
                        type="text"
                        defaultValue={section.name}
                        autoFocus
                        className="w-full bg-transparent border-b border-primary/50 focus:outline-none text-foreground"
                        onBlur={(e) => handleUpdateName(section.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleUpdateName(section.id, e.currentTarget.value);
                          }
                          if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                      />
                    ) : (
                      <span className="text-foreground font-medium truncate block">
                        {section.name}
                      </span>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8"
                      onClick={() => setEditingId(section.id)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-8 h-8 text-destructive hover:text-destructive"
                      onClick={() => removeSection(section.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              </Reorder.Item>
            ))}
          </Reorder.Group>
          
          {/* Add section form */}
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex gap-3"
            >
              <input
                type="text"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                placeholder={t.newSectionPlaceholder}
                autoFocus
                className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddSection();
                  if (e.key === "Escape") {
                    setShowAddForm(false);
                    setNewSectionName("");
                  }
                }}
              />
              <Button onClick={handleAddSection} disabled={!newSectionName.trim()}>
                {t.add}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddForm(false);
                  setNewSectionName("");
                }}
              >
                {t.cancel}
              </Button>
            </motion.div>
          )}
        </div>
        
        {/* Navigation */}
        <div className="flex justify-between pt-4">
          <Button
            variant="outline"
            size="lg"
            onClick={() => setPhase("config")}
            className="gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            {t.back}
          </Button>
          <Button
            variant="hero"
            size="lg"
            onClick={() => setPhase("write")}
            className="gap-2"
          >
            {t.startWriting}
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </motion.div>
    </div>
  );
};
