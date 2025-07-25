import React from 'react';
import { Button } from '../../ui/button';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Send, 
  Search, 
  ArrowRight, 
  Settings, 
  Play, 
  Pause,
  Star,
  Mail,
  Phone,
  User,
  Download,
  Upload
} from 'lucide-react';

const ButtonExamples: React.FC = () => {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-2xl font-bold text-black dark:text-white mb-6">Button Component Examples</h1>
      
      {/* Variants */}
      <section>
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4">Button Variants</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="flat">Flat Button</Button>
          <Button variant="danger">Danger Button</Button>
          <Button variant="success">Success Button</Button>
          <Button variant="warning">Warning Button</Button>
        </div>
      </section>

      {/* Sizes */}
      <section>
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4">Button Sizes</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button size="xs">Extra Small</Button>
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg">Large</Button>
          <Button size="xl">Extra Large</Button>
        </div>
      </section>

      {/* With Icons */}
      <section>
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4">Buttons with Icons</h2>
        <div className="flex flex-wrap gap-4">
          <Button startIcon={<Plus className="h-4 w-4" />}>Add Item</Button>
          <Button endIcon={<ArrowRight className="h-4 w-4" />}>Continue</Button>
          <Button startIcon={<Send className="h-4 w-4" />} endIcon={<ArrowRight className="h-4 w-4" />}>
            Send Message
          </Button>
        </div>
      </section>

      {/* Icon Only Buttons */}
      <section>
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4">Icon Only Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="icon" startIcon={<Edit className="h-4 w-4" />} />
          <Button variant="icon" startIcon={<Trash2 className="h-4 w-4" />} />
          <Button variant="icon" startIcon={<Settings className="h-4 w-4" />} />
          <Button variant="icon" startIcon={<Search className="h-4 w-4" />} />
          <Button variant="icon" startIcon={<Play className="h-4 w-4" />} />
          <Button variant="icon" startIcon={<Pause className="h-4 w-4" />} />
        </div>
      </section>

      {/* Different Icon Sizes */}
      <section>
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4">Icon Button Sizes</h2>
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="icon" size="xs" startIcon={<Edit className="h-3 w-3" />} />
          <Button variant="icon" size="sm" startIcon={<Edit className="h-4 w-4" />} />
          <Button variant="icon" size="md" startIcon={<Edit className="h-5 w-5" />} />
          <Button variant="icon" size="lg" startIcon={<Edit className="h-6 w-6" />} />
          <Button variant="icon" size="xl" startIcon={<Edit className="h-7 w-7" />} />
        </div>
      </section>

      {/* Action Buttons */}
      <section>
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4">Action Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary" startIcon={<Plus className="h-4 w-4" />}>
            Add Lead
          </Button>
          <Button variant="secondary" startIcon={<Mail className="h-4 w-4" />}>
            Send Email
          </Button>
          <Button variant="success" startIcon={<Phone className="h-4 w-4" />}>
            Make Call
          </Button>
          <Button variant="outline" startIcon={<User className="h-4 w-4" />}>
            View Profile
          </Button>
        </div>
      </section>

      {/* Full Width Buttons */}
      <section>
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4">Full Width Buttons</h2>
        <div className="space-y-4 max-w-md">
          <Button variant="primary" fullWidth startIcon={<Download className="h-4 w-4" />}>
            Download Report
          </Button>
          <Button variant="outline" fullWidth startIcon={<Upload className="h-4 w-4" />}>
            Upload Files
          </Button>
        </div>
      </section>

      {/* Loading States */}
      <section>
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4">Loading States</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary" loading>
            Loading...
          </Button>
          <Button variant="secondary" loading startIcon={<Send className="h-4 w-4" />}>
            Sending...
          </Button>
          <Button variant="icon" loading startIcon={<Search className="h-4 w-4" />} />
        </div>
      </section>

      {/* Disabled States */}
      <section>
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4">Disabled States</h2>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary" disabled>
            Disabled Primary
          </Button>
          <Button variant="outline" disabled>
            Disabled Outline
          </Button>
          <Button variant="ghost" disabled startIcon={<Edit className="h-4 w-4" />}>
            Disabled Ghost
          </Button>
        </div>
      </section>

      {/* Link Buttons */}
      <section>
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4">Link Buttons (Using anchor tags)</h2>
        <div className="flex flex-wrap gap-4">
          <a href="/dashboard" className="inline-block">
            <Button variant="primary">
              Go to Dashboard
            </Button>
          </a>
          <a href="https://example.com" target="_blank" rel="noopener noreferrer" className="inline-block">
            <Button variant="outline" endIcon={<ArrowRight className="h-4 w-4" />}>
              External Link
            </Button>
          </a>
        </div>
      </section>

      {/* Common Use Cases */}
      <section>
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4">Common Use Cases</h2>
        <div className="space-y-4">
          {/* Form Actions */}
          <div className="flex gap-4">
            <Button variant="outline">Cancel</Button>
            <Button variant="primary" type="submit">Save Changes</Button>
          </div>
          
          {/* Table Actions */}
          <div className="flex gap-2">
            <Button variant="icon" size="sm" startIcon={<Edit className="h-4 w-4" />} />
            <Button variant="icon" size="sm" startIcon={<Trash2 className="h-4 w-4" />} />
            <Button variant="icon" size="sm" startIcon={<Star className="h-4 w-4" />} />
          </div>
          
          {/* Search Bar */}
          <div className="flex gap-2 max-w-md">
            <input 
              type="text" 
              placeholder="Search..." 
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
            <Button variant="primary" startIcon={<Search className="h-4 w-4" />}>
              Search
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ButtonExamples; 