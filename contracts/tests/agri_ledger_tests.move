#[test_only]
module terranode::agri_ledger_tests {
    use terranode::agri_ledger;
    use sui::test_scenario;

    const FARMER: address = @0xA;
    const LOGISTICS: address = @0xB;
    const RETAILER: address = @0xC;
    const ATTACKER: address = @0xD;

    #[test]
    fun farmer_to_logistics_and_logistics_retransfer() {
        let mut scenario = test_scenario::begin(FARMER);
        agri_ledger::mint_batch(
            std::string::utf8(b"MAIZE"),
            125000,
            vector[
                7, 7, 7, 7, 7, 7, 7, 7,
                7, 7, 7, 7, 7, 7, 7, 7,
                7, 7, 7, 7, 7, 7, 7, 7,
                7, 7, 7, 7, 7, 7, 7, 7
            ],
            scenario.ctx(),
        );

        scenario.next_tx(FARMER);
        {
            let batch = scenario.take_from_sender<agri_ledger::ProduceBatch>();
            assert!(agri_ledger::get_custodian(&batch) == FARMER);
            assert!(agri_ledger::get_weight_grams(&batch) == 125000);
            agri_ledger::transfer_custody(batch, LOGISTICS, scenario.ctx());
        };

        scenario.next_tx(LOGISTICS);
        {
            let batch = scenario.take_from_sender<agri_ledger::ProduceBatch>();
            assert!(agri_ledger::get_custodian(&batch) == LOGISTICS);
            agri_ledger::transfer_custody(batch, RETAILER, scenario.ctx());
        };

        scenario.next_tx(RETAILER);
        {
            let batch = scenario.take_from_sender<agri_ledger::ProduceBatch>();
            assert!(agri_ledger::get_custodian(&batch) == RETAILER);
            scenario.return_to_sender(batch);
        };
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 0, location = terranode::agri_ledger)]
    fun mismatched_custodian_cannot_transfer() {
        let mut scenario = test_scenario::begin(ATTACKER);
        let batch = agri_ledger::new_test_batch(FARMER, 1000, scenario.ctx());
        agri_ledger::transfer_custody(batch, LOGISTICS, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 2, location = terranode::agri_ledger)]
    fun self_transfer_is_rejected() {
        let mut scenario = test_scenario::begin(FARMER);
        let batch = agri_ledger::new_test_batch(FARMER, 1000, scenario.ctx());
        agri_ledger::transfer_custody(batch, FARMER, scenario.ctx());
        scenario.end();
    }

    #[test]
    #[expected_failure(abort_code = 4, location = terranode::agri_ledger)]
    fun mint_requires_sha256_bytes() {
        let mut scenario = test_scenario::begin(FARMER);
        agri_ledger::mint_batch(
            std::string::utf8(b"MAIZE"),
            1000,
            vector[1, 2, 3],
            scenario.ctx(),
        );
        scenario.end();
    }
}
