from django.db import migrations, models


def empty_wallets_to_null(apps, schema_editor):
    User = apps.get_model("users", "CustomUser")
    User.objects.filter(sui_public_key="").update(sui_public_key=None)


class Migration(migrations.Migration):
    dependencies = [("users", "0002_auditevent_walletchallenge")]

    operations = [
        migrations.RunPython(empty_wallets_to_null, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="customuser",
            name="sui_public_key",
            field=models.CharField(blank=True, max_length=66, null=True, unique=True),
        ),
        migrations.AddField(
            model_name="walletchallenge",
            name="purpose",
            field=models.CharField(
                choices=[("AUTHENTICATE", "Authenticate"), ("BIND", "Bind Wallet")],
                default="AUTHENTICATE",
                max_length=30,
            ),
        ),
    ]
