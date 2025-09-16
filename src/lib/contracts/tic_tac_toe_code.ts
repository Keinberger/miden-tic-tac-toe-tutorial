export const ticTacToeCode = `

use.miden::account
use.miden::note
use.miden::account_id

const.ERR_WRONG_PLAYER="Wrong player trying to make move"
const.ERR_FIELD_PLAYED="Field has already been played on"

# Stores game nonce
const.NONCE_SLOT=0

# Nonce => Player1 ID + Player2 ID
const.PLAYER_IDS_MAPPING_SLOT=1

# Nonce => Player1 board values
const.PLAYER1_VALUES_MAPPING_SLOT=2

# Nonce => Player2 board values
const.PLAYER2_VALUES_MAPPING_SLOT=3

# Nonce => Winner
const.WINNERS_MAPPING_SLOT=4

# Line (X, Y, Z, 0) => True (1,0,0,0)
const.WINNING_LINES_MAPPING_SLOT=5

# Inputs: []
export.constructor
    # Store all possible winning lines in memory
    push.0.2.1.0 # 0 1 2
    mem_storew.4 dropw

    push.0.5.4.3 # 3 4 5
    mem_storew.8 dropw

    push.0.8.7.6 # 6 7 8
    mem_storew.12 dropw

    push.0.6.3.0 # 0 3 6
    mem_storew.16 dropw

    push.0.7.4.1 # 1 4 7
    mem_storew.20 dropw

    push.0.8.5.2 # 2 5 8
    mem_storew.24 dropw

    push.0.8.4.0 # 0 4 8
    mem_storew.28 dropw

    push.0.6.4.2 # 2 4 6
    mem_storew.32 dropw

    push.8
    dup neq.0
    # => [true, i]

    while.true
        dup mul.4
        # => [i*4, i]

        padw movup.4
        # => [i*8, 0, 0, 0, 0, i]

        mem_loadw
        # => [WINNING_LINE, i]

        push.0.0.0.1
        # => [TRUE, WINNING_LINE, i]

        swapw
        # => [WINNING_LINE, TRUE, i]

        push.WINNING_LINES_MAPPING_SLOT
        # => [winning_lines_mapping_slot, WINNING_LINE, TRUE, i]

        exec.account::set_map_item
        # => [OLD_MAP_ROOT, OLD_VALUE, i]

        dropw dropw
        # => [i]

        sub.1
        # => [i-1]

        dup neq.0
        # => [true/false, i-1]
    end

    drop
    # => []
end

# Inputs: [player2_prefix, player2_suffix]
export.create_game
    # get first player ID (sender)
    exec.note::get_sender
    # => [player1_prefix, player1_suffix, player2_prefix, player2_suffix]

    # get nonce
    push.NONCE_SLOT exec.account::get_item

    # Increment nonce
    add.1
    # => [NEW_NONCE, player1_prefix, player1_suffix, player2_prefix, player2_suffix]

    dupw
    # => [NEW_NONCE, NEW_NONCE, player1_prefix, player1_suffix, player2_prefix, player2_suffix]

    # Store nonce
    push.NONCE_SLOT exec.account::set_item
    # => [OLD_NONCE, NEW_NONCE, player1_prefix, player1_suffix, player2_prefix, player2_suffix]

    dropw
    # => [NEW_NONCE, player1_prefix, player1_suffix, player2_prefix, player2_suffix]

    # Store player IDs
    push.PLAYER_IDS_MAPPING_SLOT
    # => [mapping_slot, NEW_NONCE, player1_prefix, player1_suffix, player2_prefix, player2_suffix]

    exec.account::set_map_item
    # => [OLD_MAP_ROOT, OLD_MAP_VALUE]
    
    dropw dropw
    # => []
end

# => [NONCE, field_index]
export.make_a_move
    # Store NONCE in memory to use later
    dupw mem_storew.0 dropw
    # => [NONCE, field_index]
    
    dupw dupw
    # => [NONCE, NONCE, NONCE, field_index]
    
    # Verify sender is part of game at particular nonce
    exec.verify_and_get_player_slot
    # => [other_player_values_mapping_slot, player_values_mapping_slot, NONCE, NONCE, field_index]

    movdn.5
    # => [player_values_mapping_slot, NONCE, other_player_values_mapping_slot, NONCE, field_index]

    dup.10 movdn.5
    # => [player_values_mapping_slot, NONCE, field_index, other_player_values_mapping_slot, NONCE, field_index]

    dup movdn.12
    # => [player_values_mapping_slot, NONCE, field_index, other_player_values_mapping_slot, NONCE, field_index, player_values_mapping_slot]

    dup.11 movdn.13
    # => [player_values_mapping_slot, NONCE, field_index, other_player_values_mapping_slot, NONCE, field_index, player_values_mapping_slot, field_index]

    dup.12 movdn.14
    # => [player_values_mapping_slot, NONCE, field_index, other_player_values_mapping_slot, NONCE, field_index, player_values_mapping_slot, field_index, player_values_mapping_slot]

    exec.check_player_values
    # => [own_index_is_equal, own_num_of_values, other_player_values_mapping_slot, NONCE, field_index, player_values_mapping_slot, field_index, player_values_mapping_slot]

    movdn.7 movdn.7
    # => [other_player_values_mapping_slot, NONCE, field_index, own_index_is_equal, own_num_of_values, player_values_mapping_slot, field_index, player_values_mapping_slot]

    exec.check_player_values
    # => [other_index_is_equal, other_num_of_values, own_index_is_equal, own_num_of_values, player_values_mapping_slot, field_index, player_values_mapping_slot]

    movup.2
    # => [own_index_is_equal, other_index_is_equal, other_num_of_values, own_num_of_values, player_values_mapping_slot, field_index, player_values_mapping_slot]

    neq.1 assert.err=ERR_FIELD_PLAYED
    # => [other_index_is_equal, other_num_of_values, own_num_of_values, player_values_mapping_slot, field_index, player_values_mapping_slot]
    neq.1 assert.err=ERR_FIELD_PLAYED
    # => [other_num_of_values, own_num_of_values, player_values_mapping_slot, field_index, player_values_mapping_slot]

    movup.2
    # => [player_values_mapping_slot, other_num_of_values, own_num_of_values, field_index, player_values_mapping_slot]

    # Compare number of non-zero items between the two (to verify who is on the move)
    push.PLAYER1_VALUES_MAPPING_SLOT eq
    if.true
        # (if ID=1 => other player num has to be equal)
        dup.1 eq assert.err=ERR_WRONG_PLAYER
    else
        # (if ID=2 => other player num has to be lower)
        dup.1 lt assert.err=ERR_WRONG_PLAYER
    end
    # => [own_num_of_values, field_index, player_values_mapping_slot]

    # Check if player is making final move
    dup push.4 eq
    if.true
        # Final move (no storage, directly checking win)
        # if final move (use additional stack items to cast winning line)
        # call cast_win
        push.888 drop
    else
        padw mem_loadw.0
        # => [NONCE, own_num_of_values, field_index, player_values_mapping_slot]

        dup.6
        # => [player_values_mapping_slot, NONCE, own_num_of_values, field_index, player_values_mapping_slot]
        exec.account::get_map_item
        # => [PLAYER_VALUES, own_num_of_values, field_index, player_values_mapping_slot]

        movup.4
        # => [own_num_of_values, PLAYER_VALUES, field_index, player_values_mapping_slot]

        dup push.0 eq
        if.true
            # is zero
            drop
            # => [PLAYER_VALUES, field_index, player_values_mapping_slot]

            # drop index
            drop

            # move field_index to top
            movup.3
        else
            dup push.1 eq
            if.true
                # is 1
                drop
                # => [PLAYER_VALUES, field_index, player_values_mapping_slot]

                # move index that needs to be replaced to top
                swap

                # drop index
                drop

                # move field_index to top
                movup.3

                # move new index to correct position
                swap
            else
                dup push.2 eq
                if.true
                    drop
                    # => [PLAYER_VALUES, field_index, player_values_mapping_slot]

                    # move index that needs to be replaced to top
                    movup.2

                    # drop index
                    drop

                    # move field_index to top
                    movup.3

                    # move new index to correct position
                    movdn.2
                else
                    dup push.3 eq
                    if.true
                        drop
                        # => [PLAYER_VALUES, field_index, player_values_mapping_slot]

                        # move index that needs to be replaced to top
                        movup.3

                        # drop index
                        drop
                    end
                end
            end
        end
        # => [NEW_PLAYER_VALUES, player_values_mapping_slot]

        padw mem_loadw.0
        # => [NONCE, NEW_PLAYER_VALUES, player_values_mapping_slot]

        movup.8
        # => [player_values_mapping_slot, NONCE, NEW_PLAYER_VALUES]
        
        # Store new values
        exec.account::set_map_item
        # => [OLD_MAP_ROOT, OLD_MAP_VALUE]

        dropw dropw
        # => []

        padw mem_loadw.0 push.PLAYER1_VALUES_MAPPING_SLOT
        exec.account::get_map_item

        dropw
    end
end

# Inputs: [NONCE, WINNING_LINE]
# cast_win procedure for "casting win" (throws error if no valid win)
# procedure for casting win game (calls check_win, calls check_draw, if both fail => error)
export.cast_win
    push.111 drop
end

# Inputs: [slot, NONCE, field_index]
# Outputs: [has_field_index, num_of_non_zero_values]
proc.check_player_values
    exec.account::get_map_item
    # => [PLAYER_VALUES, field_index]

    mem_storew.4 dropw
    # => [field_index]

    push.0.0
    # => [has_field_index, num_of_non_zero_values, field_index]

    movup.2
    # => [field_index, has_field_index, num_of_non_zero_values]

    push.0
    dup neq.4
    # [true, i, field_index, has_field_index, num_of_non_zero_values]

    while.true
        # get current player_value
        padw mem_loadw.4
        # => [PLAYER_VALUES, i, field_index, has_field_index, num_of_non_zero_values]

        # TODO: Depending on i, determine the correct player value item of PLAYER_VALUES
        dup.4
        # => [i, PLAYER_VALUES, i, field_index, has_field_index, num_of_non_zero_values]

        # Move correct player_value to top
        neq.0
        if.true
            # If 1, swap
            dup.4 eq.1
            if.true
                swap
            else
                # If 2 or more, use movup 
                dup.4 eq.2
                if.true
                    movup.2
                else
                    movup.3
                end
            end
        end

        movdn.3
        # => [PLAYER_VALUES-1, player_value, i, field_index, has_field_index, num_of_non_zero_values]

        drop drop drop
        # => [player_value, i, field_index, has_field_index, num_of_non_zero_values]

        dup
        # => [player_value, player_value, i, field_index, has_field_index, num_of_non_zero_values]

        dup.3
        # => [field_index, player_value, player_value, i, field_index, has_field_index, num_of_non_zero_values]

        eq
        # => [is_equal, player_value, i, field_index, has_field_index, num_of_non_zero_values]

        if.true
            drop
            # => [i, field_index, has_field_index, num_of_non_zero_values]
            
            drop swap add.1
            # => [true, field_index, num_of_non_zero_values]

            swap
            # => [field_index, true, num_of_non_zero_values]

            push.3
            # => [3, field_index, true, num_of_non_zero_values]
        else
            # Check for non zero
            push.0 neq
            # => [is_zero, i, field_index, has_field_index, num_of_non_zero_values]

            if.true
                # Store counter for num_of_non_zero_values (if not zero)

                movup.3 add.1
                # => [num_of_non_zero_values+1, i, field_index, has_field_index]

                movdn.3
                # => [i, field_index, has_field_index, num_of_non_zero_values+1]
            end
        end
        # => [i, field_index, has_field_index, num_of_non_zero_values]

        add.1
        dup neq.4
        # [true/false, i-1]
    end
    # => [last_i, field_index, has_field_index, num_of_non_zero_values]
    
    drop drop
    # => [has_field_index, num_of_non_zero_values]
end

# Inputs: [NONCE]
# Outputs: [other_player_slot, player_slot]
proc.verify_and_get_player_slot
    push.PLAYER_IDS_MAPPING_SLOT
    # => [player_ids_slot, NONCE]
    
    exec.account::get_map_item
    # => [PLAYER_IDS]

    exec.note::get_sender
    # => [caller_prefix, caller_suffix, PLAYER_IDS]

    exec.account_id::is_equal
    # => [is_player1, player2_prefix, player2_suffix]

    if.false
        exec.note::get_sender
        # => [caller_prefix, caller_suffix, player2_prefix, player2_suffix]

        exec.account_id::is_equal
        # => [is_player2]

        assert.err=ERR_WRONG_PLAYER
        # => []

        push.PLAYER2_VALUES_MAPPING_SLOT.PLAYER1_VALUES_MAPPING_SLOT
    else
        drop drop
        # => []

        push.PLAYER1_VALUES_MAPPING_SLOT.PLAYER2_VALUES_MAPPING_SLOT
    end
    # => [other_player_values_mapping_slot, player_values_mapping_slot]
end
`;

export default ticTacToeCode;
