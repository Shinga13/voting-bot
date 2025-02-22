// this test is obviously not a real test

const VOTE_BLUEPRINT = {
    'Wiki1': [5, 2, 0],
    'Wiki2': [0, 0, 0],
    'Wiki3': [1, 0, 0],
    'Wiki4': [25, 2, 3],
    'Wiki5': [50, 7, 1],
    'Wiki6': [0, 2, 0],
    'Wiki7': [1, 0, 0],
    'Wiki8': [4, 1, 1],
    'Wiki9': [0, 0, 8],
};

function evaluate_vote(vote) {
    console.log(vote);
    let yes_rationales = [];
    let no_rationales = [];
    let abstain_rationales = [];
    let current_ballot;
    let votes_by_ident = {};
    for (let voter_id in vote.voters) {
        if (Object.keys(vote.voters[voter_id]).length < 1) {
            continue;
        }
        for (let identification in vote.voters[voter_id]) {
            if (!(identification in votes_by_ident)) {
                votes_by_ident[identification] = { Yes: 0, No: 0, Abstain: 0, _sum: 0, _weight: null };
            }
            current_ballot = vote.ballots[vote.voters[voter_id][identification]];
            if (current_ballot.decision === 'Yes') {
                yes_rationales.push(current_ballot.rationale);
                votes_by_ident[identification].Yes++;
            }
            else if (current_ballot.decision === 'No') {
                no_rationales.push(current_ballot.rationale);
                votes_by_ident[identification].No++;
            }
            else if (current_ballot.decision === 'Abstain') {
                abstain_rationales.push(current_ballot.rationale);
                votes_by_ident[identification].Abstain++;
            }
            votes_by_ident[identification]._sum++;
        }
    }
    const archived_vote = {
        title: vote.title,
        subject: vote.subject,
        start_timestamp: vote.start_timestamp,
        end_timestamp: vote.end_timestamp,
        creator_id: vote.creator_id,
        creator_name: vote.creator_name,
        creator_icon: vote.creator_icon,
        created_timestamp: vote.created_timestamp,
        yes: yes_rationales,
        no: no_rationales,
        abstain: abstain_rationales,
        invalid: 0,
    }
    const max_votes = Math.max(...Object.keys(votes_by_ident).map(id => votes_by_ident[id]._sum));
    Object.keys(votes_by_ident).forEach(id => votes_by_ident[id]._weight = max_votes / votes_by_ident[id]._sum);
    let weighed_yes = 0;
    let weighed_no = 0;
    let weighed_abstain = 0;
    let current_weight = 0;
    for (let identification in votes_by_ident) {
        current_weight = votes_by_ident[identification]._weight;
        weighed_yes = weighed_yes + votes_by_ident[identification].Yes * current_weight;
        weighed_no = weighed_no + votes_by_ident[identification].No * current_weight;
        weighed_abstain = weighed_abstain + votes_by_ident[identification].Abstain * current_weight;
    }
    archived_vote.weighed_yes = weighed_yes;
    archived_vote.weighed_no = weighed_no;
    archived_vote.weighed_abstain = weighed_abstain;

    archived_vote.yes_count = archived_vote.yes.length;
    archived_vote.no_count = archived_vote.no.length;
    archived_vote.abstain_count = archived_vote.abstain.length;

    return archived_vote;
}

function mock_vote(seed) {
    const vote = {
        title: 'Mock Vote',
        subject: 'Entirely fake data',
        start_timestamp: -1,
        end_timestamp: -1,
        creator_id: -1,
        creator_name: 'Nobody',
        creator_icon: null,
        created_timestamp: -1,
        voters: {},
        ballots: {}
    };
    let user_id = 0;
    let ballot_id = Date.now();
    for (let ident in seed) {
        for (let i = 0; i < seed[ident][0]; i++) {
            vote.voters[user_id] = {};
            vote.voters[user_id][ident] = ballot_id;
            vote.ballots[ballot_id] = {
                id: ballot_id,
                decision: 'Yes',
                rationale: '<yes-rationale>'
            };
            user_id++;
            ballot_id++;
        }
        for (let i = 0; i < seed[ident][1]; i++) {
            vote.voters[user_id] = {};
            vote.voters[user_id][ident] = ballot_id;
            vote.ballots[ballot_id] = {
                id: ballot_id,
                decision: 'No',
                rationale: '<no-rationale>'
            };
            user_id++;
            ballot_id++;
        }
        for (let i = 0; i < seed[ident][2]; i++) {
            vote.voters[user_id] = {};
            vote.voters[user_id][ident] = ballot_id;
            vote.ballots[ballot_id] = {
                id: ballot_id,
                decision: 'Abstain',
                rationale: '<abstain-rationale>'
            };
            user_id++;
            ballot_id++;
        }
    }
    return vote;
}

// run the test
console.log(evaluate_vote(mock_vote(VOTE_BLUEPRINT)));
