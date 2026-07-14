# Generated for the ProduceBatch schema per spec (farmer, data_integrity_hash, sui_tx_digest).

import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('telemetry', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ProduceBatch',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('crop_type', models.CharField(max_length=100)),
                ('weight_kg', models.DecimalField(decimal_places=2, max_digits=10)),
                ('data_integrity_hash', models.CharField(blank=True, default='', max_length=64)),
                ('sui_object_id', models.CharField(blank=True, max_length=66, null=True, unique=True)),
                ('sui_tx_digest', models.CharField(blank=True, max_length=66, null=True)),
                ('status', models.CharField(choices=[('PENDING', 'Pending Chain Confirmation'), ('MINTED', 'Minted on Sui'), ('IN_TRANSIT', 'In Transit'), ('DELIVERED', 'Delivered')], default='PENDING', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('current_custodian', models.ForeignKey(on_delete=django.db.models.deletion.RESTRICT, related_name='custodial_batches', to=settings.AUTH_USER_MODEL)),
                ('farmer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='batches', to=settings.AUTH_USER_MODEL)),
                ('origin_telemetry', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.RESTRICT, related_name='batches', to='telemetry.environmentaltelemetry')),
            ],
            options={
                'ordering': ['-created_at'],
                'indexes': [models.Index(fields=['status'], name='ledger_batch_status_idx'), models.Index(fields=['farmer'], name='ledger_batch_farmer_idx')],
            },
        ),
    ]
