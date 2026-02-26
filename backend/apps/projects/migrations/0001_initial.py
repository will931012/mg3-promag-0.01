from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=180)),
                ('location', models.CharField(max_length=180)),
                ('client', models.CharField(max_length=180)),
                ('budget', models.DecimalField(decimal_places=2, max_digits=14)),
                ('start_date', models.DateField()),
                ('end_date', models.DateField()),
                ('progress', models.PositiveSmallIntegerField(default=0)),
                ('status', models.CharField(choices=[('planning', 'Planning'), ('active', 'Active'), ('at_risk', 'At Risk'), ('done', 'Completed')], default='planning', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
