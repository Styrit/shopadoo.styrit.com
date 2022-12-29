// document.addEventListener('DOMContentLoaded', d => {
//     document.querySelector('.loader').textContent = 'Data loaded, preparing application...'
// })

function startLoader()
{
    let info = document.querySelector('.splash #info')

    // do not load if info is not there (for example on uwp)
    if (info)
    {
        let count = 0
        let loadingText = 'Loading'

        let intervalHandler = () =>
        {
            if (document.querySelector('.splash #info') == null)
            {
                clearInterval(intervalTimer)
                return
            }

            if (count == 4)
            {
                info.removeAttribute('hidden')
            }

            if (count > 30)
            {
                clearInterval(intervalTimer)
                info.textContent = 'It seems there is a problem :-|'
            }
            count++
        }
        let intervalTimer = setInterval(intervalHandler, 1000)
    }
}

startLoader()