module terranode::agri_ledger {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::string::String;
    use sui::event;

    // ══════════════════════════════════════════
    //  OBJECTS
    // ══════════════════════════════════════════

    /// Programmable Object representing a verifiable crop batch in transit.
    struct ProduceBatch has key, store {
        id: UID,
        crop_type: String,
        weight_kg: u64,
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
    }

    struct CustodyTransferred has copy, drop {
        batch_id: address,
        from: address,
        to: address,
    }

    // ══════════════════════════════════════════
    //  ENTRY FUNCTIONS
    // ══════════════════════════════════════════

    public entry fun mint_batch(
        crop_type: String,
        weight_kg: u64,
        integrity_hash: vector<u8>,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        let batch = ProduceBatch {
            id: object::new(ctx),
            crop_type,
            weight_kg,
            origin_farmer_address: sender,
            current_custodian_address: sender,
            data_integrity_hash: integrity_hash,
        };

        event::emit(BatchMinted {
            batch_id: object::uid_to_address(&batch.id),
            farmer: sender,
            crop_type: batch.crop_type,
        });

        transfer::public_transfer(batch, sender);
    }

    public entry fun transfer_custody(
        batch: &mut ProduceBatch,
        new_custodian: address,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);
        assert!(batch.current_custodian_address == sender, 0);

        event::emit(CustodyTransferred {
            batch_id: object::uid_to_address(&batch.id),
            from: sender,
            to: new_custodian,
        });

        batch.current_custodian_address = new_custodian;
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
}
