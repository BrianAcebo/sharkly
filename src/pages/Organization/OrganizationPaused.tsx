import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useAuth } from '../../hooks/useAuth';
import { useOrganizationStatus } from '../../hooks/useOrganizationStatus';
import { useBreadcrumbs } from '../../hooks/useBreadcrumbs';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface OrganizationPausedProps {
  reason?: 'paused' | 'payment_required';
  onResume?: () => void;
}

export default function OrganizationPaused() {
  return null;
}
