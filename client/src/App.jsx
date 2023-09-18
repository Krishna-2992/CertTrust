import { useState, useEffect } from 'react'
import { Web3Storage } from 'web3.storage'
import { contractAddress, contractABI } from './constants'
import { ethers } from 'ethers'
import { AiOutlineCopy } from 'react-icons/ai'

function App() {
    const [state, setState] = useState({
        provider: null,
        signer: null,
        contract: null,
    })
    const [connected, setConnected] = useState(false)
    const [cid, setCid] = useState('')
    const [signature, setSignature] = useState('')
    const [page, setPage] = useState('sign')
    const [account, setAccount] = useState('')
    const [showSignerInput, setShowSignerInput] = useState(false)
    const [signedTxData, setSignedTxData] = useState([])
    const [receivedTxData, setReceivedTxData] = useState([])

    const connectWallet = async () => {
        try {
            if (window.ethereum !== 'undefined') {
                const accounts = await window.ethereum.request({
                    method: 'eth_requestAccounts',
                })
                setAccount(accounts[0])

                const provider = new ethers.providers.Web3Provider(
                    window.ethereum
                )
                const signer = provider.getSigner()
                const contract = new ethers.Contract(
                    contractAddress,
                    contractABI,
                    signer
                )
                setState({ provider, signer, contract })
                console.log('connected accounts', accounts)
                document.getElementById('connect_button').innerHTML =
                    'connected'
                setConnected(true)
            } else {
                alert('Please install metamask')
            }
        } catch (error) {
            console.log(error.code)
        }
    }

    async function uploadImg() {
        const file = document.getElementById('file').files[0]
        const files = []
        files.push(file)
        console.log(`Uploading ${files.length} files`)
        const token =
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkaWQ6ZXRocjoweDNjOUYwZDA0MTdDMTI5MDcxYjlDMmFGNDc2MDhCNTk3M0YyRTI0N0YiLCJpc3MiOiJ3ZWIzLXN0b3JhZ2UiLCJpYXQiOjE2OTM2NTc2MjcxMTcsIm5hbWUiOiJzaWduYXR1cmVWZXJpZmljYXRpb24ifQ.Vmy5HOXDCNRpBcmGLZwbCzpGpNE4qrFf1UE_43lk5tY'
        const storage = new Web3Storage({ token })
        const cid = await storage.put(files)
        setCid(cid)
        console.log('Content added with CID:', cid)
    }

    // function getEthSignedMessageHash(_messageHash) {
    //     const prefix = '\x19Ethereum Signed Message:\n32'
    //     const packedMessage = ethers.utils.solidityPack(
    //         ['string', 'bytes32'],
    //         [prefix, _messageHash]
    //     )
    //     const hash = ethers.utils.keccak256(packedMessage)
    //     // console.log('hash', hash)
    //     return hash
    // }

    async function getSignature() {
        const packedMessage = ethers.utils.solidityPack(['string'], [cid])
        const hash = ethers.utils.keccak256(packedMessage)

        // console.log('ethSignedHash', getEthSignedMessageHash(hash))

        const res = await window.ethereum.request({
            method: 'personal_sign',
            params: [account, hash],
        })
        console.log('signature:', res)
        setSignature(res)
    }

    async function checkValidity() {
        let signingAuthority = document.querySelector('#signer').value
        if (signingAuthority[0] === '"') {
            signingAuthority = signingAuthority.substring(
                1,
                signingAuthority.length - 1
            )
        }
        const msg = document.querySelector('#msg').value
        const signature = document.querySelector('#signature').value
        const valid = await state.contract.verify(
            signingAuthority,
            msg,
            signature
        )
        console.log('signature is', valid)
        document.querySelector('#valid').innerHTML = `<h1>${valid}</h1>`
    }

    async function saveData() {
        const receiver = document.querySelector('#receiver').value
        const message = document.querySelector('#message').value

        console.log(receiver, message, cid)
        console.log(signature)
        console.log(account)

        console.log('sendign transactoin...')

        // const saved = await state.contract.storeSignature(
        //     account,
        //     "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        //     "bafybeiglbadhcqxzt5bledxbnvyxgmaxan2bwtv3idxd5xdbngahb4t4na",
        //     "0x675c42f76f12db63b1cda31e3ddc66a148ad7f64cf09a31c72e0af865726f2ea5c2bbc8e4bf8e30ca979f5a6bdeaf14cacd4c612af16425172afe6d329f7562f1c",
        //     "a message"
        // )
        const saved = await state.contract.storeSignature(
            account,
            receiver,
            cid.toString(),
            signature,
            message
        )
        await saved.wait()
        console.log('saveData ', saved)
    }

    // async function setSenderData() {
    //     if (state.contract) {
    //       const senderTxIds = await state.contract.retrieveSenderSignaturesTxIds(account);
    //       console.log('ids are', senderTxIds);

    //       const transactions = await Promise.all(senderTxIds.map(async (id) => {
    //         console.log('in🙃🙃');
    //         const transaction = await state.contract.getTransactionById(id);
    //         return transaction;
    //       }));

    //       setSignedTxData(transactions);
    //     }
    //   }

    async function setSenderData() {
      console.log('setsenderData is called...!!')
      console.log('account: ', account)
        if (state.contract) {
            const senderTxIds =
                await state.contract.retrieveSenderSignaturesTxIds(account)
              console.log(senderTxIds)
            setSignedTxData([])
            await senderTxIds.forEach(async (id) => {
                const transaction = await state.contract.getTransactionById(id)
                setSignedTxData((prev) => [...prev, transaction])
            })
        }
    }

    async function setReceiverData() {
        if (state.contract) {
            const receiverTxIds =
                await state.contract.retrieveRecieverSignaturesTxIds(account)

            setReceivedTxData([])
            console.log('receiverTxIds', receiverTxIds)
            await receiverTxIds.forEach(async (id) => {
                const transaction = await state.contract.getTransactionById(id)
                setReceivedTxData((prev) => [...prev, transaction])
            })
        }
    }

    async function getSignerAddress() {
        const msg = document.querySelector('#msg').value
        const signature = document.querySelector('#signature').value
        const signerAddress = await state.contract.getSigner(msg, signature)
        console.log('signature is', signerAddress)
        document.querySelector('#valid').innerHTML = `<h1>${signerAddress}</h1>`
    }

    async function consoleData() {
      try {
        const tx = await state.contract.getTransactionById(0);
        console.log(tx)
      } catch (error) {
        console.error('Error with getTransactionById:', error);
      }
    }

    return (
        <div className='bg-[#E4E4D0] h-screen'>
            {/* Navbar */}
            <div className='flex justify-between items-center bg-[#94A684]'>
                <div className='m-4 font-semibold'>
                    Krishna's signature verification dApp
                </div>
                <div className='mx-8 my-2'>
                    <button
                        onClick={connectWallet}
                        id='connect_button'
                        className='bg-[#AEC3AE] m-4 p-4 px-20 rounded-md'
                    >
                        connect wallet
                    </button>
                </div>
            </div>

            <button onClick={saveData}>savedata</button>
            <button onClick={consoleData}>consoledata</button>

            {connected ? (
                <div>
                    <div className='flex flex-row justify-center'>
                        <div
                            className={`text-3xl cursor-pointer mx-20 m-4 p-2 rounded-md ${
                                page === 'sign' ? 'bg-[#94A684]' : ''
                            }`}
                            onClick={() => setPage('sign')}
                        >
                            Sign
                        </div>
                        <div
                            className={`text-3xl cursor-pointer mx-20 m-4 p-2 rounded-md ${
                                page === 'verify' ? 'bg-[#94A684]' : ''
                            }`}
                            onClick={() => setPage('verify')}
                        >
                            Verify
                        </div>
                        <div
                            className={`text-3xl cursor-pointer mx-20 m-4 p-2 rounded-md ${
                                page === 'data' ? 'bg-[#94A684]' : ''
                            }`}
                            onClick={() => {
                                setPage('data')
                                setSenderData()
                                setReceiverData()
                            }}
                        >
                            Data
                        </div>
                    </div>
                    {page === 'sign' && (
                        <div className='flex flex-col md:flex-row w-screen '>
                            <div className='md:w-1/2 font-semibold p-4'>
                                Lorem ipsum dolor sit amet consectetur
                                adipisicing elit. Ex, nulla explicabo numquam
                                enim aperiam illum voluptatum unde? Blanditiis
                                error, labore exercitationem vero odio aliquid
                                temporibus dignissimos. Ipsum dolore minima
                                similique? Sint perferendis laudantium doloribus
                                quaerat dolor, eaque officia expedita natus quas
                                culpa quod atque facere exercitationem delectus
                                repellendus unde eum magnam saepe quos quisquam
                                odit blanditiis reprehenderit. Quia mollitia
                                recusandae dolor officiis natus quis architecto
                                illo est nulla ratione cum ut, consequuntur,
                                esse dolore molestias veritatis aliquid totam
                                nesciunt temporibus sequi saepe suscipit. Omnis
                                exercitationem quo tenetur sint nisi cum
                                corrupti, temporibus, dolore necessitatibus
                                delectus aspernatur, excepturi facere? Deleniti,
                                doloremque.
                            </div>
                            <div className='flex flex-col md:w-1/2 rounded-lg border-white border-4 justify-self-center items-center'>
                                {cid ? (
                                    <div className='m-4'>
                                        <span className='font-semibold'>
                                            cid:{' '}
                                        </span>
                                        {`${cid}`}
                                    </div>
                                ) : (
                                    <div className='flex flex-col md:flex-row justify-around m-4'>
                                        <div className=''>
                                            <input type='file' id='file' />
                                        </div>
                                        <button
                                            onClick={uploadImg}
                                            className='bg-[#AEC3AE] rounded-md'
                                        >
                                            Upload to IPFS
                                        </button>
                                    </div>
                                )}
                                {signature ? (
                                    <div className='m-4 flex flex-row items-center'>
                                        <div className='w-full overflow-hidden '>
                                            {`${signature.slice(0, 20)}...`}
                                        </div>
                                        <div
                                            onClick={async () => {
                                                await navigator.clipboard.writeText(
                                                    signature
                                                )
                                            }}
                                            className='cursor-pointer'
                                        >
                                            <AiOutlineCopy />
                                        </div>
                                    </div>
                                ) : (
                                    <div className='w-full p-4'>
                                        <button
                                            onClick={getSignature}
                                            className='bg-[#AEC3AE] w-full p-4 rounded-md'
                                        >
                                            Sign the CID
                                        </button>
                                    </div>
                                )}
                                <div>
                                    <input
                                        type='text'
                                        className='border-black border m-2'
                                        placeholder='receiver address'
                                        id='receiver'
                                    />
                                </div>
                                <div>
                                    <input
                                        type='text'
                                        className='border-black border m-2'
                                        placeholder='message'
                                        id='message'
                                    />
                                </div>
                                <div>
                                    {signature && (
                                        <button
                                            className='bg-[#AEC3AE] w-full p-4 rounded-md m-4'
                                            onClick={saveData}
                                        >
                                            save to blockchain
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {page === 'verify' && (
                        <div className='flex flex-col items-center'>
                            <div className='flex flex-row items-center'>
                                <div className='text-2xl font-semibold indie'>
                                    message:{' '}
                                </div>
                                <input
                                    type='text'
                                    id='msg'
                                    className='m-4 p-2'
                                    placeholder='signed message'
                                />
                            </div>
                            <div className='flex flex-row items-center'>
                                <div className='text-2xl font-semibold indie'>
                                    signature:{' '}
                                </div>
                                <input
                                    type='text'
                                    id='signature'
                                    className='m-4 p-2'
                                    placeholder='signature'
                                />
                            </div>
                            {showSignerInput && (
                                <div className='flex flex-row items-center'>
                                    <div className='text-2xl font-semibold indie'>
                                        signer address:{' '}
                                    </div>
                                    <input
                                        type='text'
                                        id='signer'
                                        className='m-4 p-2'
                                        placeholder='signing authority'
                                    />
                                </div>
                            )}
                            <div className='flex flex-col justify-center items-center'>
                                {!showSignerInput ? (
                                    <button
                                        onClick={getSignerAddress}
                                        className='bg-[#AEC3AE] m-4 mb-1 p-4 px-20 rounded-md indie font-semibold text-2xl'
                                    >
                                        Get the signer address
                                    </button>
                                ) : (
                                    <button
                                        onClick={checkValidity}
                                        className='bg-[#AEC3AE] m-4 mb-1 p-4 px-20 rounded-md indie font-semibold text-2xl'
                                    >
                                        Get the confirmation for address
                                    </button>
                                )}
                                <div
                                    id='valid'
                                    className='text-2xl font-semibold'
                                ></div>
                            </div>
                            {!showSignerInput ? (
                                <div
                                    className='text-sm indie text-blue-900 cursor-pointer'
                                    onClick={() => {
                                        setShowSignerInput(true)
                                    }}
                                >
                                    already have the signer address? try this
                                </div>
                            ) : (
                                <div
                                    className='text-sm indie text-blue-900 cursor-pointer'
                                    onClick={() => {
                                        setShowSignerInput(false)
                                    }}
                                >
                                    didn't have the signer address?
                                </div>
                            )}
                        </div>
                    )}

                    {page === 'data' && (
                        <div className='flex w-full justify-around'>
                            <div className='border border-black w-full m-4 pt-0 p-2'>
                                <div className='underline underline-offset-2 mb-2'>
                                    messages you signed:
                                </div>
                                {signedTxData.map((tx) => {
                                    return (
                                        <div>
                                            <div>
                                                timestamp:{' '}
                                                {tx.timestamp.toString()}
                                            </div>
                                            <div>signer: {tx.receiver}</div>
                                            <div>
                                                signature:{' '}
                                                {`${tx.signature.slice(
                                                    0,
                                                    40
                                                )}...`}
                                            </div>
                                            <div>message: {tx.message}</div>
                                            <br />
                                        </div>
                                    )
                                })}
                            </div>
                            <div className='border border-black w-full m-4 pt-0 p-2 rounded-2xl  font-semibold'>
                                <div className='underline underline-offset-2 mb-2 indie'>
                                    signatures you received:
                                </div>
                                {receivedTxData.map((tx) => {
                                    return (
                                        <div className='border border-black mx-2 rounded-2xl p-2'>
                                            <div className='indie'>
                                                timestamp:{' '}
                                                {tx.timestamp.toString()}
                                            </div>
                                            <div className='indie'>signer: {tx.sender}</div>
                                            <div className='flex items-center'>
                                                <div className='indie'>
                                                    signature:{' '}
                                                    {`${tx.signature.slice(
                                                        0,
                                                        40
                                                    )}...`}
                                                </div>
                                                <div
                                                    onClick={async () => {
                                                        await navigator.clipboard.writeText(
                                                            tx.signature
                                                        )
                                                    }}
                                                    className='cursor-pointer indie'
                                                >
                                                    <AiOutlineCopy />
                                                </div>
                                            </div>
                                            <div className='indie'>message: {tx.message}</div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className='text-3xl font-semibold flex justify-center'>
                    Please connect the wallet first!!
                </div>
            )}
        </div>
    )
}

export default App

// bafybeiet634wewlvid6cuhjxydtr5jsqsl6rcwh2lqgjzpynypn3tfrh6u
// 0x7fe0889abd566e036bd58563e8322450a76684f6376c513bec2a962d1b37ec707eec6af10936c2847f0d58a2de051242d2c153b2ee3366c6fef7a60a9da16eaa1b

// bafybeibqwwesxreb75iawd3guwjtolqsgp2ckryln5imzwzq4xzpsebmzi
// 0x08c6c4783b39ab260e4881fb67b27ffbbcc3162a982f6f2780dedbec2e4493c0243c91379deb77acf4bb14bb8fe2b7abe5e2e313d2544ac93d25464a06586eef1b