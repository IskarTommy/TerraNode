from django.db import migrations, models
import django.core.validators
from decimal import Decimal


def blank_transfer_digests_to_null(apps, schema_editor):
    CustodyTransfer = apps.get_model("ledger", "CustodyTransfer")
    CustodyTransfer.objects.filter(tx_digest="").update(tx_digest=None)


class Migration(migrations.Migration):
    dependencies = [("ledger", "0003_custodytransfer")]

    operations = [
        migrations.RunPython(blank_transfer_digests_to_null, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="producebatch",
            name="weight_kg",
            field=models.DecimalField(
                decimal_places=3,
                help_text="Canonical off-chain weight in kilograms; converted exactly to integer grams on-chain.",
                max_digits=10,
                validators=[django.core.validators.MinValueValidator(Decimal("0.001"))],
            ),
        ),
        migrations.AlterField(
            model_name="producebatch",
            name="sui_tx_digest",
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="producebatch",
            name="mint_verification",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="producebatch",
            name="mint_verified_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AlterField(
            model_name="custodytransfer",
            name="tx_digest",
            field=models.CharField(blank=True, max_length=100, null=True, unique=True),
        ),
        migrations.AddConstraint(
            model_name="custodytransfer",
            constraint=models.CheckConstraint(
                condition=~models.Q(from_user=models.F("to_user")),
                name="ledger_transfer_distinct_users",
            ),
        ),
    ]
