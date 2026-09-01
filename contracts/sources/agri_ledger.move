module terranode::agri_ledger {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::string::String;
    use sui::event;

    // ══════════════════════════════════════════
    //  ERRORS
    // ══════════════════════════════════════════
    const ENotCustodian: u64 = 0;
    const EInvalidRecipient: u64 = 1;
    const ESameCustodian: u64 = 2;
    const EInvalidWeight: u64 = 3;
    const EInvalidIntegrityHash: u64 = 4;

    // ══════════════════════════════════════════
    //  OBJECTS
    // ══════════════════════════════════════════

    /// Traceability record representing a verifiable crop batch in transit.
    /// Weight is represented in canonical integer units (grams).
    struct ProduceBatch has key, store {
        id: UID,
        crop_type: String,
        weight_grams: u64,
        origin_farmer_address: address,
        current_custodian_address: address,
        data_integrity_hash: vector<u8>,
    }

    // ══════════════════════════════════════════
    //  EVENTS
    // ══════════════════════════════════════════

    struct BatchMinted has copy, drop {
        batch_id: address,
        farmer: address,
        crop_type: String,
        weight_grams: u64,
        data_integrity_hash: vector<u8>,
    }

    struct CustodyTransferred has copy, drop {
        batch_id: address,
        from: address,
        to: address,
        weight_grams: u64,
    }

    // ══════════════════════════════════════════
    //  ENTRY FUNCTIONS
    // ══════════════════════════════════════════

    /// Mints a new ProduceBatch traceability record and transfers object ownership to the farmer.
    public entry fun mint_batch(
        crop_type: String,
        weight_grams: u64,
        integrity_hash: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(weight_grams > 0, EInvalidWeight);
        assert!(vector::length(&integrity_hash) == 32, EInvalidIntegrityHash);
        let batch = ProduceBatch {
            id: object::new(ctx),
            crop_type: crop_type,
            weight_grams: weight_grams,
            origin_farmer_address: sender,
            current_custodian_address: sender,
            data_integrity_hash: integrity_hash,
        };

        event::emit(BatchMinted {
            batch_id: object::uid_to_address(&batch.id),
            farmer: sender,
            crop_type: batch.crop_type,
            weight_grams: weight_grams,
            data_integrity_hash: batch.data_integrity_hash,
        });

        transfer::public_transfer(batch, sender);
    }

    /// Transfers custody of a ProduceBatch traceability record.
    /// Takes object ownership by value (`batch`), mutates `current_custodian_address` in-place,
    /// emits `CustodyTransferred` event, and transfers object ownership to `new_custodian`.
    public entry fun transfer_custody(
        mut batch: ProduceBatch,
        new_custodian: address,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(batch.current_custodian_address == sender, ENotCustodian);
        assert!(new_custodian != @0x0, EInvalidRecipient);
        assert!(new_custodian != sender, ESameCustodian);

        batch.current_custodian_address = new_custodian;

        event::emit(CustodyTransferred {
            batch_id: object::uid_to_address(&batch.id),
            from: sender,
            to: new_custodian,
            weight_grams: batch.weight_grams,
        });

        transfer::public_transfer(batch, new_custodian);
    }

    // ══════════════════════════════════════════
    //  READ FUNCTIONS
    // ══════════════════════════════════════════

    public fun get_integrity_hash(batch: &ProduceBatch): &vector<u8> {
        &batch.data_integrity_hash
    }

    public fun get_custodian(batch: &ProduceBatch): address {
        batch.current_custodian_address
    }

    public fun get_weight_grams(batch: &ProduceBatch): u64 {
        batch.weight_grams
    }

    public fun get_crop_type(batch: &ProduceBatch): &String {
        &batch.crop_type
    }

    #[test_only]
    public fun new_test_batch(
        custodian: address,
        weight_grams: u64,
        ctx: &mut TxContext
    ): ProduceBatch {
        ProduceBatch {
            id: object::new(ctx),
            crop_type: std::string::utf8(b"TEST"),
            weight_grams,
            origin_farmer_address: custodian,
            current_custodian_address: custodian,
            data_integrity_hash: vector[
                0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0,
                0, 0, 0, 0, 0, 0, 0, 0
            ],
        }
    }
}
