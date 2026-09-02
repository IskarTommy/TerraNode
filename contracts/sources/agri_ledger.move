module terranode::agri_ledger {
    use std::string::String;
    use sui::event;

    // ══════════════════════════════════════════
    //  ERRORS
    // ══════════════════════════════════════════
    const ENotCustodian: u64 = 0;
    const EInvalidRecipient: u64 = 1;

    // ══════════════════════════════════════════
    //  OBJECTS
    // ══════════════════════════════════════════

    /// Traceability record representing a verifiable crop batch in transit.
    /// Weight is represented in canonical integer units (grams).
    public struct ProduceBatch has key, store {
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

    public struct BatchMinted has copy, drop {
        batch_id: address,
        farmer: address,
        crop_type: String,
        weight_grams: u64,
        data_integrity_hash: vector<u8>,
    }

    public struct CustodyTransferred has copy, drop {
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
        let sender = ctx.sender();
        let batch = ProduceBatch {
            id: object::new(ctx),
            crop_type,
            weight_grams,
            origin_farmer_address: sender,
            current_custodian_address: sender,
            data_integrity_hash: integrity_hash,
        };

        event::emit(BatchMinted {
            batch_id: object::uid_to_address(&batch.id),
            farmer: sender,
            crop_type: batch.crop_type,
            weight_grams,
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
        let sender = ctx.sender();
        assert!(batch.current_custodian_address == sender, ENotCustodian);
        assert!(new_custodian != @0x0, EInvalidRecipient);

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
}
