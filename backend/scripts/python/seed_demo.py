import os
from datetime import date, timedelta

import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.projects.models import Milestone, Project, Risk, Task  # noqa: E402


project, _ = Project.objects.get_or_create(
    name='MG3 Central Tower',
    defaults={
        'location': 'Austin, TX',
        'client': 'MG3 Group',
        'budget': 3500000,
        'start_date': date.today() - timedelta(days=30),
        'end_date': date.today() + timedelta(days=240),
        'progress': 22,
        'status': 'active',
    },
)

Task.objects.get_or_create(
    project=project,
    title='Concrete pour - Section B',
    defaults={
        'assignee': 'Site Engineer',
        'due_date': date.today() + timedelta(days=5),
        'priority': 'high',
        'is_done': False,
    },
)

Milestone.objects.get_or_create(
    project=project,
    title='Foundation complete',
    defaults={
        'target_date': date.today() + timedelta(days=15),
        'is_complete': False,
    },
)

Risk.objects.get_or_create(
    project=project,
    title='Steel delivery delay',
    defaults={
        'severity': 'medium',
        'status': 'open',
        'mitigation': 'Secondary supplier pre-approved and on standby.',
    },
)

print('Seed complete.')
