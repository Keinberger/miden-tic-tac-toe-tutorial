const createGameNoteCode = `
use.miden::note
use.external_contract::game_contract

const.ERR_WRONG_NUMBER_OF_INPUTS = "Note expects exactly 2 note input fields"

# Inputs: [player2_prefix, player2_suffix]
begin
    push.0 exec.note::get_inputs
    # => [num_inputs, inputs_ptr]
    
    eq.2 assert.err=ERR_WRONG_NUMBER_OF_INPUTS
    # => [inputs_ptr]
    
    padw movup.4 mem_loadw drop drop
    # => [player2_prefix, player2_suffix]

    call.game_contract::create_game
    # => []

    drop drop
end
`;

export default createGameNoteCode;
